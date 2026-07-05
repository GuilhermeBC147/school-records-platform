import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatStartTime } from "@/lib/bonus-classes";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function getTodayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { end, start };
}

export default async function ReceptionDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const today = getTodayRange();
  const [
    bonusClassesToday,
    pendingAttendance,
    activeStudents,
    activeClasses,
    activeTeachers,
    upcomingBonusClasses,
  ] = await Promise.all([
    prisma.bonusClass.count({
      where: {
        scheduledDate: { gte: today.start, lt: today.end },
        status: "SCHEDULED",
      },
    }),
    prisma.bonusClass.count({
      where: {
        attendanceStatus: "PENDING",
        scheduledDate: { lt: today.end },
        status: "SCHEDULED",
      },
    }),
    prisma.student.count({ where: { isActive: true } }),
    prisma.class.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, role: "TEACHER" } }),
    prisma.bonusClass.findMany({
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      take: 6,
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
  ]);

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
        <section className="intro" aria-labelledby="reception-title">
          <p className="eyebrow">Reception dashboard</p>
          <h1 id="reception-title">Reception</h1>
          <p className="lede">
            Schedule bonus classes, scan teacher availability, and answer
            parent-facing student or class questions.
          </p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          ) : null}
        </section>

        <section className="dashboard-metric-grid" aria-label="Reception overview">
          <article className="metric">
            <span>{bonusClassesToday}</span>
            <strong>Bonus classes today</strong>
          </article>
          <article className="metric">
            <span>{pendingAttendance}</span>
            <strong>Pending attendance</strong>
          </article>
          <article className="metric">
            <span>{activeStudents}</span>
            <strong>Active students</strong>
          </article>
          <article className="metric">
            <span>{activeClasses}</span>
            <strong>Active classes</strong>
          </article>
          <article className="metric">
            <span>{activeTeachers}</span>
            <strong>Available teachers</strong>
          </article>
        </section>

        <section className="dashboard-action-grid" aria-label="Reception workflows">
          <Link className="dashboard-action-card" href="/reception/bonus-classes">
            <span>Schedule</span>
            <strong>Bonus classes</strong>
            <small>Student, subject, teacher, date, time, and notes.</small>
          </Link>
          <Link className="dashboard-action-card" href="/reception/calendar">
            <span>Calendar</span>
            <strong>Teacher availability</strong>
            <small>Daily grid by teacher and time slot.</small>
          </Link>
          <Link className="dashboard-action-card" href="/reception/students">
            <span>Lookup</span>
            <strong>Students</strong>
            <small>Attendance, grades, active class, and recent class context.</small>
          </Link>
          <Link className="dashboard-action-card" href="/reception/classes">
            <span>Lookup</span>
            <strong>Classes</strong>
            <small>Roster, teacher, schedule, and recent submitted lessons.</small>
          </Link>
        </section>

        <section className="panel dashboard-feed" aria-labelledby="reception-feed-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Schedule</p>
              <h2 id="reception-feed-title">Next bonus classes</h2>
            </div>
            <Link className="text-link" href="/reception/bonus-classes">
              View all
            </Link>
          </div>
          <div className="dashboard-feed-list">
            {upcomingBonusClasses.map((bonusClass) => (
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
                  {bonusClass.student.fullName} with {bonusClass.teacher.name}
                </span>
                <small>{bonusClass.subject}</small>
              </Link>
            ))}
            {upcomingBonusClasses.length === 0 ? (
              <p className="muted-copy">No scheduled bonus classes coming up.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
