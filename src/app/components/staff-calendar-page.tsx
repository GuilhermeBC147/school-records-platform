import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarGrid } from "@/app/components/calendar-grid";
import { DateInput } from "@/app/components/date-input";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import {
  getCalendarWeekday,
  safeCalendarDate,
  type CalendarEvent,
} from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type StaffCalendarPageProps = {
  pageRole: "ADMIN" | "RECEPTION";
  searchParams: Promise<{
    date?: string;
    teacherId?: string;
  }>;
};

export async function StaffCalendarPage({
  pageRole,
  searchParams,
}: StaffCalendarPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (
    pageRole === "ADMIN" && currentUser.role !== "ADMIN"
  ) {
    redirect("/dashboard");
  }

  if (
    pageRole === "RECEPTION" &&
    currentUser.role !== "RECEPTION" &&
    currentUser.role !== "ADMIN"
  ) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const calendarDate = safeCalendarDate(query.date);
  const selectedTeacherId = query.teacherId?.trim() || undefined;
  const selectedWeekday = getCalendarWeekday(calendarDate.date);
  const allTeachers = await prisma.user.findMany({
    orderBy: { name: "asc" },
    where: { isActive: true, role: "TEACHER" },
    select: { id: true, name: true },
  });
  const teachers = selectedTeacherId
    ? allTeachers.filter((teacher) => teacher.id === selectedTeacherId)
    : allTeachers;
  const [classes, bonusClasses] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
      where: {
        isActive: true,
        weekDays: { has: selectedWeekday },
        ...(selectedTeacherId ? { teacherId: selectedTeacherId } : {}),
      },
      select: {
        classType: true,
        durationMinutes: true,
        id: true,
        name: true,
        startTime: true,
        teacherId: true,
        teacher: { select: { name: true } },
      },
    }),
    prisma.bonusClass.findMany({
      orderBy: [{ startTime: "asc" }, { teacher: { name: "asc" } }],
      where: {
        scheduledDate: calendarDate.date,
        status: { not: "CANCELED" },
        ...(selectedTeacherId ? { teacherId: selectedTeacherId } : {}),
      },
      select: {
        attendanceStatus: true,
        durationMinutes: true,
        id: true,
        scheduledDate: true,
        startTime: true,
        status: true,
        subject: true,
        student: { select: { fullName: true } },
        teacherId: true,
        teacher: { select: { name: true } },
      },
    }),
  ]);
  const canEditClasses = currentUser.role === "ADMIN";
  const classEvents: CalendarEvent[] = classes
    .filter((schoolClass) => schoolClass.startTime)
    .map((schoolClass) => ({
      kind: "CLASS" as const,
      className: schoolClass.name,
      classType: schoolClass.classType,
      date: calendarDate.date,
      durationMinutes: schoolClass.durationMinutes,
      href: canEditClasses
        ? `/admin/classes/${schoolClass.id}`
        : `/reception/classes?classId=${schoolClass.id}`,
      id: schoolClass.id,
      startTime: schoolClass.startTime,
      teacherId: schoolClass.teacherId,
      teacherName: schoolClass.teacher.name,
    }));
  const bonusEvents: CalendarEvent[] = bonusClasses.map((bonusClass) => ({
    kind: "BONUS" as const,
    attendanceStatus: bonusClass.attendanceStatus,
    date: bonusClass.scheduledDate,
    durationMinutes: bonusClass.durationMinutes,
    href: `/reception/bonus-classes/${bonusClass.id}`,
    id: bonusClass.id,
    startTime: bonusClass.startTime,
    status: bonusClass.status,
    studentName: bonusClass.student.fullName,
    subject: bonusClass.subject,
    teacherId: bonusClass.teacherId,
    teacherName: bonusClass.teacher.name,
  }));
  const events = [...classEvents, ...bonusEvents];
  const unscheduledClasses = classes.filter((schoolClass) => !schoolClass.startTime);
  const backHref = currentUser.role === "ADMIN" ? "/dashboard" : "/reception";
  const backLabel =
    currentUser.role === "ADMIN"
      ? t("label.backToDashboard")
      : t("label.backToReception");
  const pageLabel = pageRole === "ADMIN" ? t("dashboard.adminDashboard") : t("dashboard.reception");

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="staff-calendar-title">
          <Link className="text-link" href={backHref}>
            {backLabel}
          </Link>
          <p className="eyebrow">{pageLabel}</p>
          <h1 id="staff-calendar-title">{t("dashboard.calendar")}</h1>
          <p className="lede">{t("calendar.staffCopy")}</p>
          <div className="action-row">
            <Link className="primary-link" href="/reception/bonus-classes">
              {t("label.scheduleBonusClass")}
            </Link>
          </div>
        </section>

        <section className="panel" aria-label={t("label.calendarFilters")}>
          <form className="filter-form compact-filter-form">
            <label>
              <span>{t("label.date")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                defaultValue={calendarDate.label}
                name="date"
                required
              />
            </label>
            <label>
              <span>{t("label.teacher")}</span>
              <select defaultValue={selectedTeacherId ?? ""} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {allTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.view")}
              </button>
              <Link className="text-link" href={pageRole === "ADMIN" ? "/admin/calendar" : "/reception/calendar"}>
                {t("dashboard.today")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="daily-calendar-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{formatWeekdays([selectedWeekday], currentUser.locale)}</p>
              <h2 id="daily-calendar-title">{t("label.dailyTeacherCalendar")}</h2>
            </div>
            <span className="status-pill">{events.length}</span>
          </div>
          <CalendarGrid
            dateFormat={currentUser.dateFormat}
            dates={[calendarDate.date]}
            events={events}
            locale={currentUser.locale}
            mode="day"
            teachers={teachers}
            t={t}
          />
          {events.length === 0 ? (
            <p className="muted-copy">{t("calendar.noEvents")}</p>
          ) : null}
        </section>

        {unscheduledClasses.length > 0 ? (
          <section className="panel data-panel" aria-labelledby="unscheduled-classes-title">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">{t("calendar.unscheduledEyebrow")}</p>
                <h2 id="unscheduled-classes-title">{t("calendar.unscheduledTitle")}</h2>
              </div>
            </div>
            <div className="calendar-unscheduled-list">
              {unscheduledClasses.map((schoolClass) => (
                <Link
                  className="calendar-unscheduled-item"
                  href={
                    canEditClasses
                      ? `/admin/classes/${schoolClass.id}`
                      : `/reception/classes?classId=${schoolClass.id}`
                  }
                  key={schoolClass.id}
                >
                  <strong>{schoolClass.name}</strong>
                  <span>{schoolClass.teacher.name}</span>
                  <small>{formatDuration(schoolClass.durationMinutes)}</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
