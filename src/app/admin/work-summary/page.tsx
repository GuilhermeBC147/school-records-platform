import Link from "next/link";
import { redirect } from "next/navigation";
import { formatStartTime } from "@/lib/bonus-classes";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
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

type AdminWorkSummaryPageProps = {
  searchParams: Promise<{
    month?: string;
    status?: string;
    teacherId?: string;
  }>;
};

export default async function AdminWorkSummaryPage({
  searchParams,
}: AdminWorkSummaryPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const month = readMonth(query.month);
  const selectedTeacherId = query.teacherId?.trim() || undefined;
  const teachers = await prisma.user.findMany({
    orderBy: { name: "asc" },
    where: { role: "TEACHER" },
    select: {
      id: true,
      isActive: true,
      name: true,
    },
  });
  const summaryTeacherIds = selectedTeacherId
    ? [selectedTeacherId]
    : teachers
        .filter((teacher) => teacher.isActive)
        .map((teacher) => teacher.id);
  const summaries = (
    await Promise.all(
      summaryTeacherIds.map((teacherId) =>
        getTeacherWorkSummary({
          end: month.end,
          start: month.start,
          teacherId,
        }),
      ),
    )
  ).filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="work-summary-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.adminReview")}</p>
          <h1 id="work-summary-title">{t("dashboard.workSummaries")}</h1>
          <p className="lede">{t("text.workSummaryAdminCopy")}</p>
        </section>

        {query.status === "created" || query.status === "meeting-created" ? (
          <p className="form-success">
            {query.status === "meeting-created"
              ? t("message.meetingSaved")
              : t("message.paidActivitySaved")}
          </p>
        ) : null}

        <section className="panel" aria-label={t("label.monthlyDetails")}>
          <form className="filter-form compact-filter-form">
            <label>
              <span>{t("label.teacher")}</span>
              <select defaultValue={selectedTeacherId ?? ""} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                    {teacher.isActive ? "" : ` (${t("label.inactive")})`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.month")}</span>
              <input
                defaultValue={month.label}
                name="month"
                title={t("label.month")}
                type="month"
              />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.apply")}
              </button>
              <Link className="text-link" href="/admin/work-summary">
                {t("label.currentMonth")}
              </Link>
            </div>
          </form>
        </section>

        <section className="records-review" aria-label={t("dashboard.workSummaries")}>
          {summaries.map((summary) => (
            <article className="panel data-panel record-review" key={summary.teacher.id}>
              <div className="record-review-header">
                <div>
                  <p className="eyebrow">{t("label.monthlyTotal")}</p>
                  <h2>{summary.teacher.name}</h2>
                  <p className="muted-copy">
                    {summary.lessons.length} {t("label.lessons")} |{" "}
                    {summary.bonusClasses.length} {t("label.bonusClasses")} |{" "}
                    {summary.workLogs.length} {t("label.paidActivities")}.
                    {summary.pendingSubstituteLessons.length > 0
                      ? ` ${summary.pendingSubstituteLessons.length} ${t("label.pendingSubstituteLessons")}.`
                      : ""}
                  </p>
                </div>
                <div className="metric compact-metric">
                  <span>{formatHours(summary.totalMinutes)}</span>
                  <strong>{t("label.finalizedHours")}</strong>
                </div>
              </div>

              <div className="metric-grid compact-metrics">
                <article className="metric">
                  <span>{summary.lessons.length}</span>
                  <strong>{t("label.lessons")}</strong>
                </article>
                <article className="metric">
                  <span>{formatHours(summary.lessonMinutes)}</span>
                  <strong>{t("label.lessonHours")}</strong>
                </article>
                <article className="metric">
                  <span>{summary.bonusClasses.length}</span>
                  <strong>{t("label.bonusClasses")}</strong>
                </article>
                <article className="metric">
                  <span>{formatHours(summary.bonusClassMinutes)}</span>
                  <strong>{t("label.bonusHours")}</strong>
                </article>
                <article className="metric">
                  <span>{summary.workLogs.length}</span>
                  <strong>{t("dashboard.activity")}</strong>
                </article>
                <article className="metric">
                  <span>{formatHours(summary.workLogMinutes)}</span>
                  <strong>{t("label.activityHours")}</strong>
                </article>
                <article className="metric">
                  <span>{summary.pendingSubstituteLessons.length}</span>
                  <strong>{t("label.pendingSubstituteLessons")}</strong>
                </article>
              </div>

              <details className="work-summary-details">
                <summary>{t("label.completeList")}</summary>
                <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                  <th>{t("label.type")}</th>
                  <th>{t("label.date")}</th>
                  <th>{t("label.description")}</th>
                  <th>{t("label.subject")}</th>
                  <th>{t("label.students")}</th>
                  <th>{t("label.duration")}</th>
                  <th>{t("label.createdBy")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.lessons.map((lesson) => (
                      <tr key={lesson.id}>
                        <td>
                          {lesson.substitutionStatus === "APPROVED"
                            ? t("label.approvedSubstitute")
                            : t("label.regularLesson")}
                        </td>
                        <td>
                          {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                        </td>
                        <td>
                          {lesson.class.name} | {lesson.name ?? t("label.lesson")}
                        </td>
                        <td>-</td>
                        <td>-</td>
                        <td>{formatDuration(lesson.class.durationMinutes)}</td>
                        <td>{t("label.classRecordSource")}</td>
                      </tr>
                    ))}
                    {summary.bonusClasses.map((bonusClass) => (
                      <tr key={bonusClass.id}>
                        <td>{t("label.completedBonusClass")}</td>
                        <td>
                          {formatShortDate(
                            bonusClass.scheduledDate,
                            currentUser.dateFormat,
                          )}
                        </td>
                        <td>
                          {bonusClass.student.fullName} | {bonusClass.subject} |{" "}
                          {formatStartTime(bonusClass.startTime)}
                        </td>
                        <td>{bonusClass.subject}</td>
                        <td>{bonusClass.student.fullName}</td>
                        <td>{formatDuration(bonusClass.durationMinutes)}</td>
                        <td>{t("label.receptionSchedule")}</td>
                      </tr>
                    ))}
                    {summary.workLogs.map((workLog) => (
                      <tr key={workLog.id}>
                        <td>
                          {formatTeacherWorkCategory(
                            workLog.category,
                            currentUser.locale,
                          )}
                        </td>
                        <td>
                          {formatShortDate(workLog.workDate, currentUser.dateFormat)}
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
                        <td>{workLog.createdBy.name}</td>
                      </tr>
                    ))}
                    {summary.pendingSubstituteLessons.map((lesson) => (
                      <tr key={lesson.id}>
                        <td>{t("label.pendingSubstitute")}</td>
                        <td>
                          {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                        </td>
                        <td>
                          {lesson.class.name} | {lesson.name ?? t("label.lesson")}
                        </td>
                        <td>-</td>
                        <td>-</td>
                        <td>{formatDuration(lesson.class.durationMinutes)}</td>
                        <td>{t("label.adminApprovalPending")}</td>
                      </tr>
                    ))}
                    {summary.lessons.length +
                      summary.bonusClasses.length +
                      summary.workLogs.length +
                      summary.pendingSubstituteLessons.length ===
                    0 ? (
                      <tr>
                        <td colSpan={7}>{t("message.noCountedWorkMonth")}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                </div>
              </details>
            </article>
          ))}
        </section>

      </div>
    </main>
  );
}
