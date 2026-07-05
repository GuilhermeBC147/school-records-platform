import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { formatStartTime } from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Weekday } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    day?: string;
  }>;
};

function getCurrentWeekday() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
    .format(new Date())
    .toUpperCase();

  return weekdayOptions.some((option) => option.value === weekday)
    ? (weekday as Weekday)
    : undefined;
}

function readWeekday(value: string | undefined) {
  if (weekdayOptions.some((option) => option.value === value)) {
    return value as Weekday;
  }

  return undefined;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { end, start };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "RECEPTION") {
    redirect("/reception");
  }

  const params = await searchParams;
  const selectedDay =
    currentUser.role === "TEACHER"
      ? params.day === "all"
        ? undefined
        : readWeekday(params.day) ?? getCurrentWeekday()
      : undefined;
  const dashboardTitle =
    currentUser.role === "ADMIN" ? "Admin dashboard" : currentUser.name;
  const dashboardLede =
    currentUser.role === "ADMIN"
      ? "Manage school records, staff accounts, reception tools, risk review, and teacher work summaries from one place."
      : "Open class records, review assigned bonus classes, and manage your monthly work summary.";

  const classes =
    currentUser.role === "TEACHER"
      ? await prisma.class.findMany({
          where: {
            teacherId: currentUser.id,
            isActive: true,
            ...(selectedDay ? { weekDays: { has: selectedDay } } : {}),
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
  const dayFilterValue = params.day === "all" ? "all" : selectedDay ?? "";
  const visibleClassesLabel =
    dayFilterValue === "all"
      ? "All classes"
      : weekdayOptions.find((option) => option.value === selectedDay)?.label ??
        "Today";
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
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Class Records Platform</strong>
            <span>{currentUser.name}</span>
          </div>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="main data-page">
        <section className="intro" aria-labelledby="dashboard-title">
          <p className="eyebrow">{currentUser.role.toLowerCase()} dashboard</p>
          <h1 id="dashboard-title">{dashboardTitle}</h1>
          <p className="lede">{dashboardLede}</p>
        </section>

        {currentUser.role === "ADMIN" && adminDashboard ? (
          <>
            <section className="dashboard-metric-grid" aria-label="Admin overview">
              <article className="metric">
                <span>{adminDashboard.activeStaff}</span>
                <strong>Active staff</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.activeClasses}</span>
                <strong>Active classes</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.activeStudents}</span>
                <strong>Active students</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.lessonsToday}</span>
                <strong>Lessons today</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.pendingSubstitutions}</span>
                <strong>Pending substitutions</strong>
              </article>
              <article className="metric">
                <span>{adminDashboard.bonusClassesToday}</span>
                <strong>Bonus classes today</strong>
              </article>
            </section>

            <section className="dashboard-action-grid" aria-label="Admin workflows">
              <Link className="dashboard-action-card" href="/admin/manage-accounts">
                <span>Staff</span>
                <strong>Manage accounts</strong>
                <small>Create teacher or reception access and deactivate old logins.</small>
              </Link>
              <Link className="dashboard-action-card" href="/admin/classes">
                <span>Classes</span>
                <strong>Manage classes</strong>
                <small>Maintain active classes, schedules, teachers, and rosters.</small>
              </Link>
              <Link className="dashboard-action-card" href="/admin/students">
                <span>Students</span>
                <strong>Manage students</strong>
                <small>Update student status and keep records tidy.</small>
              </Link>
              <Link className="dashboard-action-card" href="/admin/risk">
                <span>Review</span>
                <strong>Student risk</strong>
                <small>Check unresolved attendance and homework signals.</small>
              </Link>
              <Link className="dashboard-action-card" href="/admin/work-summary">
                <span>Payroll</span>
                <strong>Work summaries</strong>
                <small>Audit lessons, bonus classes, activities, and meetings.</small>
              </Link>
              <Link className="dashboard-action-card" href="/admin/substitutions">
                <span>Approvals</span>
                <strong>Review substitutions</strong>
                <small>Approve, reject, or undo substitute lesson payroll claims.</small>
              </Link>
              <Link className="dashboard-action-card" href="/reception">
                <span>Front desk</span>
                <strong>Reception tools</strong>
                <small>Schedule bonus classes and answer class lookup questions.</small>
              </Link>
            </section>

            <section className="panel dashboard-feed" aria-labelledby="admin-feed-title">
              <div className="section-heading-row">
                <div>
                  <p className="eyebrow">Upcoming</p>
                  <h2 id="admin-feed-title">Scheduled bonus classes</h2>
                </div>
                <Link className="text-link" href="/reception/calendar">
                  Open calendar
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
                      {formatShortDate(bonusClass.scheduledDate)} |{" "}
                      {formatStartTime(bonusClass.startTime)}
                    </strong>
                    <span>
                      {bonusClass.student.fullName} with {bonusClass.teacher.name}
                    </span>
                    <small>{bonusClass.subject}</small>
                  </Link>
                ))}
                {adminDashboard.upcomingBonusClasses.length === 0 ? (
                  <p className="muted-copy">No scheduled bonus classes coming up.</p>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        {currentUser.role === "TEACHER" ? (
          <>
            {teacherDashboard ? (
              <>
                <section
                  className="dashboard-metric-grid"
                  aria-label="Teacher overview"
                >
                  <article className="metric">
                    <span>{classes.length}</span>
                    <strong>{visibleClassesLabel}</strong>
                  </article>
                  <article className="metric">
                    <span>{visibleClassStudentCount}</span>
                    <strong>Visible students</strong>
                  </article>
                  <article className="metric">
                    <span>{visibleClassLessonCount}</span>
                    <strong>Submitted lessons</strong>
                  </article>
                  <article className="metric">
                    <span>{teacherDashboard.bonusClassesToday}</span>
                    <strong>Bonus classes today</strong>
                  </article>
                  <article className="metric">
                    <span>{teacherDashboard.pendingBonusAttendance}</span>
                    <strong>Pending bonus attendance</strong>
                  </article>
                </section>

                <section
                  className="dashboard-action-grid teacher-action-grid"
                  aria-label="Teacher workflows"
                >
                  <Link className="dashboard-action-card" href="/dashboard/work">
                    <span>Payroll</span>
                    <strong>Monthly summary</strong>
                    <small>Review counted lessons, bonus classes, and paid activities.</small>
                  </Link>
                  <Link className="dashboard-action-card" href="/dashboard/work/new">
                    <span>Activity</span>
                    <strong>Add event</strong>
                    <small>Record bonus classes, extra activities, or other paid work.</small>
                  </Link>
                  <Link
                    className="dashboard-action-card"
                    href="/dashboard/bonus-classes"
                  >
                    <span>Attendance</span>
                    <strong>Bonus classes</strong>
                    <small>Confirm attendance for assigned bonus classes.</small>
                  </Link>
                  <Link
                    className="dashboard-action-card"
                    href="/dashboard/substitutions/new"
                  >
                    <span>Substitution</span>
                    <strong>Substitute lesson</strong>
                    <small>Submit class records when covering another teacher.</small>
                  </Link>
                  <Link className="dashboard-action-card" href="/dashboard/account">
                    <span>Account</span>
                    <strong>Account settings</strong>
                    <small>Update your password and review your account details.</small>
                  </Link>
                </section>

                <section className="panel" aria-label="Class filters">
                  <form className="filter-form compact-filter-form">
                    <label>
                      <span>Day</span>
                      <select defaultValue={dayFilterValue} name="day">
                        <option value="all">All days</option>
                        {weekdayOptions.map((weekday) => (
                          <option key={weekday.value} value={weekday.value}>
                            {weekday.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="filter-actions">
                      <button className="primary-button" type="submit">
                        Apply
                      </button>
                      <Link className="text-link" href={allClassesHref}>
                        Show all
                      </Link>
                    </div>
                  </form>
                </section>

                <section className="class-grid" aria-label={visibleClassesLabel}>
                  {classes.map((schoolClass) => (
                    <Link
                      className="panel class-card teacher-class-card"
                      href={`/dashboard/classes/${schoolClass.id}`}
                      key={schoolClass.id}
                    >
                      <div>
                        <p className="eyebrow">
                          {schoolClass.book ?? "Class"}
                          {schoolClass.semester && schoolClass.year
                            ? ` | Semester ${schoolClass.semester}/${schoolClass.year}`
                            : ""}
                        </p>
                        <h2>{schoolClass.name}</h2>
                        <p>
                          {formatWeekdays(schoolClass.weekDays)} |{" "}
                          {formatDuration(schoolClass.durationMinutes)}
                        </p>
                      </div>
                      <dl>
                        <div>
                          <dt>Students</dt>
                          <dd>{schoolClass._count.enrollments}</dd>
                        </div>
                        <div>
                          <dt>Lessons</dt>
                          <dd>{schoolClass._count.lessons}</dd>
                        </div>
                      </dl>
                    </Link>
                  ))}
                  {classes.length === 0 ? (
                    <article className="panel class-card">
                      <h2>No classes for {visibleClassesLabel.toLowerCase()}</h2>
                      <Link className="text-link" href={allClassesHref}>
                        Show all classes
                      </Link>
                    </article>
                  ) : null}
                </section>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
