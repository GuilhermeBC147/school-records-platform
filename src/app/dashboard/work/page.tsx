import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { formatStartTime } from "@/lib/bonus-classes";
import {
  formatHours,
  formatTeacherWorkCategory,
  getTeacherWorkSummary,
  readMonth,
} from "@/lib/teacher-work";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type TeacherWorkPageProps = {
  searchParams: Promise<{
    month?: string;
    status?: string;
  }>;
};

export default async function TeacherWorkPage({
  searchParams,
}: TeacherWorkPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/admin/work-summary");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const month = readMonth(query.month);
  const summary = await getTeacherWorkSummary({
    end: month.end,
    start: month.start,
    teacherId: currentUser.id,
  });

  if (!summary) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="work-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.teacherWork")}</p>
          <h1 id="work-title">{t("dashboard.monthlySummary")}</h1>
          <p className="lede">{t("text.workSummaryTeacherCopy")}</p>
          <div className="action-row">
            <Link className="primary-link" href="/dashboard/work/new">
              {t("dashboard.addActivity")}
            </Link>
          </div>
          <div className="metric-grid">
            <article className="metric">
              <span>{summary.lessons.length}</span>
              <strong>{t("label.lessons")}</strong>
            </article>
            <article className="metric">
              <span>{summary.workLogs.length}</span>
              <strong>{t("dashboard.activity")}</strong>
            </article>
            <article className="metric">
              <span>{summary.bonusClasses.length}</span>
              <strong>{t("label.bonusClasses")}</strong>
            </article>
            <article className="metric">
              <span>{summary.pendingSubstituteLessons.length}</span>
              <strong>{t("label.pendingSubstitutions")}</strong>
            </article>
            <article className="metric">
              <span>{formatHours(summary.lessonMinutes)}</span>
              <strong>{t("label.lessonHours")}</strong>
            </article>
            <article className="metric">
              <span>{formatHours(summary.totalMinutes)}</span>
              <strong>{t("label.finalizedHours")}</strong>
            </article>
          </div>
        </section>

        {query.status === "created" ? (
          <p className="form-success">{t("message.paidActivitySaved")}</p>
        ) : null}
        {query.status === "substitution-pending" ? (
          <p className="form-success">
            {t("message.substitutePending")}
          </p>
        ) : null}

        <section className="panel" aria-label={t("label.monthlyDetails")}>
          <form className="filter-form compact-filter-form">
            <label>
              <span>{t("label.month")}</span>
              <input defaultValue={month.label} name="month" type="month" />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.apply")}
              </button>
              <Link className="text-link" href="/dashboard/work">
                {t("label.currentMonth")}
              </Link>
            </div>
          </form>
        </section>

        <section className="data-grid" aria-label={t("label.monthlyDetails")}>
          <article className="panel data-panel">
            <h2>{t("label.submittedLessons")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.date")}</th>
                    <th>{t("label.class")}</th>
                    <th>{t("label.lesson")}</th>
                    <th>{t("label.type")}</th>
                    <th>{t("label.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                      </td>
                      <td>{lesson.class.name}</td>
                      <td>{lesson.name ?? "-"}</td>
                      <td>
                        {lesson.substitutionStatus === "APPROVED"
                          ? `${t("label.approvedSubstitute")} ${t("dashboard.forTeacher")} ${lesson.class.teacher.name}`
                          : t("label.regularLesson")}
                      </td>
                      <td>{formatDuration(lesson.class.durationMinutes)}</td>
                    </tr>
                  ))}
                  {summary.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={5}>{t("message.noSubmittedLessonsMonth")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>{t("label.completedBonusClasses")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.date")}</th>
                    <th>{t("label.time")}</th>
                    <th>{t("label.student")}</th>
                    <th>{t("label.subject")}</th>
                    <th>{t("label.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bonusClasses.map((bonusClass) => (
                    <tr key={bonusClass.id}>
                      <td>
                        {formatShortDate(
                          bonusClass.scheduledDate,
                          currentUser.dateFormat,
                        )}
                      </td>
                      <td>{formatStartTime(bonusClass.startTime)}</td>
                      <td>{bonusClass.student.fullName}</td>
                      <td>{bonusClass.subject}</td>
                      <td>{formatDuration(bonusClass.durationMinutes)}</td>
                    </tr>
                  ))}
                  {summary.bonusClasses.length === 0 ? (
                    <tr>
                      <td colSpan={5}>{t("message.noCompletedBonusClassesMonth")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>{t("label.paidActivities")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.date")}</th>
                    <th>{t("label.category")}</th>
                    <th>{t("label.title")}</th>
                    <th>{t("label.subject")}</th>
                    <th>{t("label.students")}</th>
                    <th>{t("label.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.workLogs.map((workLog) => (
                    <tr key={workLog.id}>
                      <td>
                        {formatShortDate(workLog.workDate, currentUser.dateFormat)}
                      </td>
                      <td>
                        {formatTeacherWorkCategory(
                          workLog.category,
                          currentUser.locale,
                        )}
                      </td>
                      <td>{workLog.title}</td>
                      <td>{workLog.subject ?? "-"}</td>
                      <td>
                        {workLog.students.length > 0
                          ? workLog.students
                              .map((item) => item.student.fullName)
                              .join(", ")
                          : "-"}
                      </td>
                      <td>{formatDuration(workLog.durationMinutes)}</td>
                    </tr>
                  ))}
                  {summary.workLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>{t("message.noPaidActivitiesMonth")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        {summary.pendingSubstituteLessons.length > 0 ? (
          <section className="panel data-panel" aria-labelledby="pending-substitutions-title">
            <h2 id="pending-substitutions-title">
              {t("label.pendingSubstituteLessons")}
            </h2>
            <p className="muted-copy">{t("text.pendingSubstitutionsCopy")}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.date")}</th>
                    <th>{t("label.class")}</th>
                    <th>{t("label.teacher")}</th>
                    <th>{t("label.lesson")}</th>
                    <th>{t("label.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pendingSubstituteLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                      </td>
                      <td>{lesson.class.name}</td>
                      <td>{lesson.class.teacher.name}</td>
                      <td>{lesson.name ?? "-"}</td>
                      <td>{formatDuration(lesson.class.durationMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
