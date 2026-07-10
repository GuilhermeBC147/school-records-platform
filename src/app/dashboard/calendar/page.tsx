import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarGrid } from "@/app/components/calendar-grid";
import { DateInput } from "@/app/components/date-input";
import { AppTopbar } from "@/app/components/app-topbar";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { formatStartTime } from "@/lib/bonus-classes";
import {
  addCalendarDays,
  dateKey,
  getCalendarWeekDates,
  getCalendarWeekStart,
  getCalendarWeekday,
  safeCalendarDate,
  type CalendarEvent,
} from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

export const dynamic = "force-dynamic";

type TeacherCalendarPageProps = {
  searchParams: Promise<{
    date?: string;
  }>;
};

export default async function TeacherCalendarPage({
  searchParams,
}: TeacherCalendarPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const calendarDate = safeCalendarDate(query.date);
  const weekStart = getCalendarWeekStart(calendarDate.date);
  const weekDates = getCalendarWeekDates(weekStart);
  const weekEnd = addCalendarDays(weekStart, 7);
  const [classes, bonusClasses, meetings] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
      where: {
        isActive: true,
        teacherId: currentUser.id,
      },
      select: {
        book: true,
        classType: true,
        durationMinutes: true,
        id: true,
        name: true,
        startTime: true,
        weekDays: true,
      },
    }),
    prisma.bonusClass.findMany({
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      where: {
        scheduledDate: { gte: weekStart, lt: weekEnd },
        status: { not: "CANCELED" },
        teacherId: currentUser.id,
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
      },
    }),
    prisma.teacherWorkLog.findMany({
      orderBy: [{ workDate: "asc" }, { startTime: "asc" }, { title: "asc" }],
      where: {
        category: "MEETING",
        createdBy: { role: "ADMIN" },
        teacherId: currentUser.id,
        workDate: { gte: weekStart, lt: weekEnd },
      },
      select: {
        durationMinutes: true,
        id: true,
        startTime: true,
        title: true,
        workDate: true,
      },
    }),
  ]);
  const classEvents: CalendarEvent[] = [];

  for (const date of weekDates) {
    const weekday = getCalendarWeekday(date);

    for (const schoolClass of classes) {
      if (!schoolClass.startTime || !schoolClass.weekDays.includes(weekday)) {
        continue;
      }

      classEvents.push({
        kind: "CLASS",
        className: schoolClass.name,
        classType: schoolClass.classType,
        book: schoolClass.book,
        date,
        durationMinutes: schoolClass.durationMinutes,
        href: `/dashboard/classes/${schoolClass.id}`,
        id: schoolClass.id,
        startTime: schoolClass.startTime,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
      });
    }
  }
  const bonusRangeHref = `/dashboard/bonus-classes?dateFrom=${dateKey(
    weekStart,
  )}&dateTo=${dateKey(addCalendarDays(weekStart, 6))}`;
  const bonusEvents: CalendarEvent[] = bonusClasses.map((bonusClass) => ({
    kind: "BONUS",
    attendanceStatus: bonusClass.attendanceStatus,
    date: bonusClass.scheduledDate,
    durationMinutes: bonusClass.durationMinutes,
    href: bonusRangeHref,
    id: bonusClass.id,
    startTime: bonusClass.startTime,
    status: bonusClass.status,
    studentName: bonusClass.student.fullName,
    subject: bonusClass.subject,
    teacherId: currentUser.id,
    teacherName: currentUser.name,
  }));
  const meetingEvents: CalendarEvent[] = meetings.map((meeting) => ({
    kind: "MEETING",
    date: meeting.workDate,
    durationMinutes: meeting.durationMinutes,
    href: "/dashboard/work",
    id: meeting.id,
    startTime: meeting.startTime,
    teacherId: currentUser.id,
    teacherName: currentUser.name,
    title: meeting.title,
  }));
  const events = [...classEvents, ...bonusEvents, ...meetingEvents];
  const unscheduledClasses = classes.filter((schoolClass) => !schoolClass.startTime);
  const unscheduledMeetings = meetings.filter((meeting) => !meeting.startTime);
  const previousWeekHref = `/dashboard/calendar?date=${dateKey(
    addCalendarDays(weekStart, -7),
  )}`;
  const nextWeekHref = `/dashboard/calendar?date=${dateKey(
    addCalendarDays(weekStart, 7),
  )}`;

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="teacher-calendar-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("dashboard.teacherWorkflows")}</p>
          <h1 id="teacher-calendar-title">{t("calendar.weeklyTitle")}</h1>
          <p className="lede">{t("calendar.weeklyCopy")}</p>
        </section>

        <section className="panel calendar-controls" aria-label={t("label.calendarFilters")}>
          <div className="calendar-week-nav">
            <Link className="secondary-link" href={previousWeekHref}>
              {t("calendar.previousWeek")}
            </Link>
            <strong>
              {t("calendar.weekOf")} {formatShortDate(weekStart, currentUser.dateFormat)}
            </strong>
            <Link className="secondary-link" href={nextWeekHref}>
              {t("calendar.nextWeek")}
            </Link>
          </div>
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
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.view")}
              </button>
              <Link className="text-link" href="/dashboard/calendar">
                {t("calendar.currentWeek")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="weekly-calendar-grid-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{currentUser.name}</p>
              <h2 id="weekly-calendar-grid-title">{t("calendar.weeklyTitle")}</h2>
            </div>
            <span className="status-pill">{events.length}</span>
          </div>
          <CalendarGrid
            dateFormat={currentUser.dateFormat}
            dates={weekDates}
            events={events}
            locale={currentUser.locale}
            mode="week"
            teachers={[{ id: currentUser.id, name: currentUser.name }]}
            t={t}
          />
          {events.length === 0 ? (
            <p className="muted-copy">{t("calendar.noEvents")}</p>
          ) : null}
        </section>

        {unscheduledClasses.length + unscheduledMeetings.length > 0 ? (
          <section className="panel data-panel" aria-labelledby="teacher-unscheduled-title">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">{t("calendar.unscheduledEyebrow")}</p>
                <h2 id="teacher-unscheduled-title">{t("calendar.unscheduledTitle")}</h2>
              </div>
            </div>
            <div className="calendar-unscheduled-list">
              {unscheduledClasses.map((schoolClass) => (
                <Link
                  className="calendar-unscheduled-item"
                  href={`/dashboard/classes/${schoolClass.id}`}
                  key={schoolClass.id}
                >
                  <strong>{schoolClass.name}</strong>
                  <span>{formatWeekdays(schoolClass.weekDays, currentUser.locale)}</span>
                  <small>{formatDuration(schoolClass.durationMinutes)}</small>
                </Link>
              ))}
              {unscheduledMeetings.map((meeting) => (
                <Link
                  className="calendar-unscheduled-item"
                  href="/dashboard/work"
                  key={`meeting-${meeting.id}`}
                >
                  <strong>{meeting.title}</strong>
                  <span>
                    {formatShortDate(meeting.workDate, currentUser.dateFormat)} |{" "}
                    {t("workCategory.MEETING")}
                  </span>
                  <small>{formatDuration(meeting.durationMinutes)}</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p className="calendar-note">
          {t("calendar.timeRangeCopy")} {formatStartTime("07:00")}–{formatStartTime("22:00")}
        </p>
      </div>
    </main>
  );
}
