import Link from "next/link";
import { redirect } from "next/navigation";
import { formatStartTime } from "@/lib/bonus-classes";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

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
  const t = getTranslations(currentUser.locale);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="reception-title">
          <p className="eyebrow">{t("dashboard.receptionDashboard")}</p>
          <h1 id="reception-title">{t("dashboard.reception")}</h1>
          <p className="lede">{t("dashboard.receptionLede")}</p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                {t("dashboard.backToDashboard")}
              </Link>
            </div>
          ) : null}
        </section>

        <section className="dashboard-metric-grid" aria-label={t("dashboard.receptionOverview")}>
          <article className="metric">
            <span>{bonusClassesToday}</span>
            <strong>{t("dashboard.bonusClassesToday")}</strong>
          </article>
          <article className="metric">
            <span>{pendingAttendance}</span>
            <strong>{t("dashboard.pendingAttendance")}</strong>
          </article>
          <article className="metric">
            <span>{activeStudents}</span>
            <strong>{t("dashboard.activeStudents")}</strong>
          </article>
          <article className="metric">
            <span>{activeClasses}</span>
            <strong>{t("dashboard.activeClasses")}</strong>
          </article>
          <article className="metric">
            <span>{activeTeachers}</span>
            <strong>{t("dashboard.availableTeachers")}</strong>
          </article>
        </section>

        <section className="dashboard-action-grid" aria-label={t("dashboard.receptionWorkflows")}>
          <Link className="dashboard-action-card" href="/reception/bonus-classes">
            <span>{t("dashboard.schedule")}</span>
            <strong>{t("dashboard.bonusClasses")}</strong>
            <small>{t("dashboard.scheduleBonusClassesCopy")}</small>
          </Link>
          <Link className="dashboard-action-card" href="/reception/calendar">
            <span>{t("dashboard.calendar")}</span>
            <strong>{t("dashboard.teacherAvailability")}</strong>
            <small>{t("dashboard.teacherAvailabilityCopy")}</small>
          </Link>
          <Link className="dashboard-action-card" href="/reception/students">
            <span>{t("dashboard.lookup")}</span>
            <strong>{t("dashboard.students")}</strong>
            <small>{t("dashboard.studentsCopy")}</small>
          </Link>
          <Link className="dashboard-action-card" href="/reception/classes">
            <span>{t("dashboard.lookup")}</span>
            <strong>{t("dashboard.classes")}</strong>
            <small>{t("dashboard.manageClassesCopy")}</small>
          </Link>
        </section>

        <section className="panel dashboard-feed" aria-labelledby="reception-feed-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{t("dashboard.schedule")}</p>
              <h2 id="reception-feed-title">{t("dashboard.nextBonusClasses")}</h2>
            </div>
            <Link className="text-link" href="/reception/bonus-classes">
              {t("dashboard.viewAll")}
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
                  {bonusClass.student.fullName} {t("dashboard.withTeacher")} {bonusClass.teacher.name}
                </span>
                <small>{bonusClass.subject}</small>
              </Link>
            ))}
            {upcomingBonusClasses.length === 0 ? (
              <p className="muted-copy">{t("dashboard.noScheduledBonusClasses")}</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
