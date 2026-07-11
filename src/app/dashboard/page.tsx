import { redirect } from "next/navigation";
import Link from "next/link";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { formatStartTime } from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import type { Weekday } from "@/generated/prisma/client";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    day?: string | string[];
    dayFilter?: string;
  }>;
};

const teacherWeekdayOptions = weekdayOptions.filter(
  (option) => option.value !== "SUNDAY",
);

function getCurrentWeekday() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
    .format(new Date())
    .toUpperCase();

  return teacherWeekdayOptions.some((option) => option.value === weekday)
    ? (weekday as Weekday)
    : undefined;
}

function readWeekdays(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const allowedWeekdays = new Set<string>(
    teacherWeekdayOptions.map((option) => option.value),
  );

  return Array.from(
    new Set(values.filter((item): item is Weekday => allowedWeekdays.has(item))),
  );
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { end, start };
}

const weekdayTranslationKeys = {
  FRIDAY: "dashboard.weekdayFriday",
  MONDAY: "dashboard.weekdayMonday",
  SATURDAY: "dashboard.weekdaySaturday",
  SUNDAY: "dashboard.weekdaySunday",
  THURSDAY: "dashboard.weekdayThursday",
  TUESDAY: "dashboard.weekdayTuesday",
  WEDNESDAY: "dashboard.weekdayWednesday",
} as const satisfies Record<Weekday, TranslationKey>;

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "RECEPTION") {
    redirect("/reception");
  }

  const params = await searchParams;
  const t = getTranslations(currentUser.locale);
  const submittedDayFilter = params.dayFilter === "custom" || params.day === "all";
  const selectedDays =
    currentUser.role === "TEACHER"
      ? (() => {
          const weekdays = readWeekdays(params.day);

          if (weekdays.length > 0 || submittedDayFilter) {
            return weekdays;
          }

          const currentWeekday = getCurrentWeekday();

          return currentWeekday ? [currentWeekday] : [];
        })()
      : [];
  const dashboardTitle =
    currentUser.role === "ADMIN" ? t("dashboard.adminDashboard") : currentUser.name;
  const dashboardLede =
    currentUser.role === "ADMIN"
      ? t("dashboard.adminLede")
      : t("dashboard.teacherLede");

  const classes =
    currentUser.role === "TEACHER"
      ? await prisma.class.findMany({
          where: {
            teacherId: currentUser.id,
            isActive: true,
            ...(selectedDays.length > 0 ? { weekDays: { hasSome: selectedDays } } : {}),
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            book: true,
            semester: true,
            year: true,
            durationMinutes: true,
            weekDays: true,
            isActive: true,
            teacher: {
              select: { name: true },
            },
            _count: {
              select: {
                enrollments: true,
                lessons: true,
              },
            },
          },
        })
      : [];
  const allClassesHref = "/dashboard?day=all";
  const visibleClassesLabel =
    selectedDays.length === 0
      ? t("dashboard.allClasses")
      : selectedDays.length === 1
        ? t(weekdayTranslationKeys[selectedDays[0]])
        : formatWeekdays(selectedDays, currentUser.locale);
  const selectedDaySet = new Set(selectedDays);
  const today = getTodayRange();
  const adminDashboard =
    currentUser.role === "ADMIN"
      ? await Promise.all([
          prisma.user.count({
            where: { isActive: true, role: { in: ["TEACHER", "RECEPTION"] } },
          }),
          prisma.class.count({ where: { isActive: true } }),
          prisma.student.count({ where: { isActive: true } }),
          prisma.lesson.count({
            where: { lessonDate: { gte: today.start, lt: today.end } },
          }),
          prisma.lesson.count({
            where: { substitutionStatus: "PENDING_APPROVAL" },
          }),
          prisma.bonusClass.count({
            where: {
              scheduledDate: { gte: today.start, lt: today.end },
              status: "SCHEDULED",
            },
          }),
          prisma.bonusClass.findMany({
            orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
            take: 5,
            where: {
              scheduledDate: { gte: today.start },
              status: "SCHEDULED",
            },
            select: {
              id: true,
              scheduledDate: true,
              startTime: true,
              subject: true,
              student: { select: { fullName: true } },
              teacher: { select: { name: true } },
            },
          }),
        ]).then(
          ([
            activeStaff,
            activeClasses,
            activeStudents,
            lessonsToday,
            pendingSubstitutions,
            bonusClassesToday,
            upcomingBonusClasses,
          ]) => ({
            activeClasses,
            activeStaff,
            activeStudents,
            bonusClassesToday,
            lessonsToday,
            pendingSubstitutions,
            upcomingBonusClasses,
          }),
        )
      : null;
  const teacherDashboard =
    currentUser.role === "TEACHER"
      ? await Promise.all([
          prisma.bonusClass.count({
            where: {
              scheduledDate: { gte: today.start, lt: today.end },
              status: "SCHEDULED",
              teacherId: currentUser.id,
            },
          }),
          prisma.bonusClass.count({
            where: {
              attendanceStatus: "PENDING",
              scheduledDate: { lt: today.end },
              status: "SCHEDULED",
              teacherId: currentUser.id,
            },
          }),
        ]).then(
          ([bonusClassesToday, pendingBonusAttendance]) => ({
            bonusClassesToday,
            pendingBonusAttendance,
          }),
        )
      : null;
  const visibleClassStudentCount = classes.reduce(
    (total, schoolClass) => total + schoolClass._count.enrollments,
    0,
  );
  const visibleClassLessonCount = classes.reduce(
    (total, schoolClass) => total + schoolClass._count.lessons,
    0,
  );

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="dashboard-title">
          <p className="eyebrow">
            {currentUser.role === "ADMIN"
              ? t("dashboard.adminDashboard")
              : t("dashboard.teacherWorkflows")}
          </p>
          <h1 id="dashboard-title">{dashboardTitle}</h1>
          <p className="lede">{dashboardLede}</p>
        </section>

        {currentUser.role === "ADMIN" && adminDashboard ? (
          <>
            <section className="panel dashboard-feed" aria-labelledby="personal-slots-admin-title">
              <div className="section-heading-row">
                <div>
                  <p className="eyebrow">{t("personalSlots.personalBooths")}</p>
                  <h2 id="personal-slots-admin-title">{t("personalSlots.title")}</h2>
                  <p className="muted-copy">{t("personalSlots.copy")}</p>
                </div>
                <Link className="primary-link" href="/reception/personal-slots">
                  {t("personalSlots.book")}
                </Link>
              </div>
            </section>

            <section className="dashboard-metric-grid" aria-label={t("dashboard.adminOverview")}>
              <article className="metric">
                <span>{adminDashboard.activeStaff}</span>
                <strong>{t("dashboard.activeStaff")}</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.activeClasses}</span>
                <strong>{t("dashboard.activeClasses")}</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.activeStudents}</span>
                <strong>{t("dashboard.activeStudents")}</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.lessonsToday}</span>
                <strong>{t("dashboard.lessonsToday")}</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.pendingSubstitutions}</span>
                <strong>{t("dashboard.pendingSubstitutions")}</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.bonusClassesToday}</span>
                <strong>{t("dashboard.bonusClassesToday")}</strong>
              </article>
            </section>

            <section className="panel dashboard-feed" aria-labelledby="admin-feed-title">
              <div className="section-heading-row">
                <div>
                  <p className="eyebrow">{t("dashboard.upcoming")}</p>
                  <h2 id="admin-feed-title">{t("dashboard.scheduledBonusClasses")}</h2>
                </div>
                <Link className="text-link" href="/reception/calendar">
                  {t("dashboard.openCalendar")}
                </Link>
              </div>
              <div className="dashboard-feed-list">
                {adminDashboard.upcomingBonusClasses.map((bonusClass) => (
                  <Link
                    className="dashboard-feed-item"
                    href={`/reception/bonus-classes/${bonusClass.id}`}
                    key={bonusClass.id}
                  >
                    <strong>
                      {formatShortDate(
                        bonusClass.scheduledDate,
                        currentUser.dateFormat,
                      )} |{" "}
                      {formatStartTime(bonusClass.startTime)}
                    </strong>
                    <span>
                      {bonusClass.student.fullName} {t("dashboard.withTeacher")} {bonusClass.teacher.name}
                    </span>
                    <small>{bonusClass.subject}</small>
                  </Link>
                ))}
                {adminDashboard.upcomingBonusClasses.length === 0 ? (
                  <p className="muted-copy">{t("dashboard.noScheduledBonusClasses")}</p>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        {currentUser.role === "TEACHER" ? (
          <>
            {teacherDashboard ? (
              <>
                <section className="panel teacher-classes-panel" aria-label={visibleClassesLabel}>
                  <form className="filter-form compact-filter-form teacher-day-filter-form">
                    <input name="dayFilter" type="hidden" value="custom" />
                    <fieldset className="weekday-filter">
                      <legend className="form-section-label">{t("dashboard.day")}</legend>
                      <div className="weekday-picker compact-weekday-picker teacher-weekday-picker">
                        {teacherWeekdayOptions.map((weekday) => (
                          <label className="checkbox-label" key={weekday.value}>
                            <input
                              defaultChecked={selectedDaySet.has(weekday.value)}
                              name="day"
                              type="checkbox"
                              value={weekday.value}
                            />
                            {t(weekdayTranslationKeys[weekday.value])}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="filter-actions">
                      <button className="primary-button" type="submit">
                        {t("dashboard.apply")}
                      </button>
                      <Link className="text-link" href={allClassesHref}>
                        {t("dashboard.showAll")}
                      </Link>
                    </div>
                  </form>

                  <div className="class-grid teacher-class-grid">
                    {classes.map((schoolClass) => (
                      <Link
                        className="class-card teacher-class-card"
                        href={`/dashboard/classes/${schoolClass.id}`}
                        key={schoolClass.id}
                      >
                        <div>
                          <p className="eyebrow">
                            {schoolClass.book ?? t("dashboard.classFallback")}
                            {schoolClass.semester && schoolClass.year
                              ? ` | ${t("dashboard.semester")} ${schoolClass.semester}/${schoolClass.year}`
                              : ""}
                          </p>
                          <h2>{schoolClass.name}</h2>
                          <p>
                            {formatWeekdays(schoolClass.weekDays, currentUser.locale)} |{" "}
                            {formatDuration(schoolClass.durationMinutes)}
                          </p>
                        </div>
                        <dl>
                          <div>
                            <dt>{t("dashboard.students")}</dt>
                            <dd>{schoolClass._count.enrollments}</dd>
                          </div>
                          <div>
                            <dt>{t("dashboard.lessons")}</dt>
                            <dd>{schoolClass._count.lessons}</dd>
                          </div>
                        </dl>
                      </Link>
                    ))}
                    {classes.length === 0 ? (
                      <article className="class-card teacher-empty-class-card">
                        <h2>
                          {t("dashboard.noClassesFor")} {visibleClassesLabel.toLowerCase()}
                        </h2>
                        <Link className="text-link" href={allClassesHref}>
                          {t("dashboard.showAllClasses")}
                        </Link>
                      </article>
                    ) : null}
                  </div>
                </section>

                <section
                  className="dashboard-metric-grid"
                  aria-label={t("dashboard.teacherOverview")}
                >
                  <article className="metric">
                    <span>{classes.length}</span>
                    <strong>{visibleClassesLabel}</strong>
                  </article>
                  <article className="metric">
                    <span>{visibleClassStudentCount}</span>
                    <strong>{t("dashboard.visibleStudents")}</strong>
                  </article>
                  <article className="metric">
                    <span>{visibleClassLessonCount}</span>
                    <strong>{t("dashboard.submittedLessons")}</strong>
                  </article>
                  <article className="metric">
                    <span>{teacherDashboard.bonusClassesToday}</span>
                    <strong>{t("dashboard.bonusClassesToday")}</strong>
                  </article>
                  <article className="metric">
                    <span>{teacherDashboard.pendingBonusAttendance}</span>
                    <strong>{t("dashboard.pendingBonusAttendance")}</strong>
                  </article>
                </section>

              </>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
