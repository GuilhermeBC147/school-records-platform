import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherWorkLogAction } from "@/app/actions/teacher-work";
import { logoutAction } from "@/app/actions/auth";
import { formatStartTime } from "@/lib/bonus-classes";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import {
  formatHours,
  formatTeacherWorkCategory,
  getTeacherWorkSummary,
  readMonth,
  teacherWorkCategories,
} from "@/lib/teacher-work";
import { getCurrentUser } from "@/lib/session";

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
    : teachers.map((teacher) => teacher.id);
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
        <section className="intro" aria-labelledby="work-summary-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin review</p>
          <h1 id="work-summary-title">Teacher work summaries</h1>
          <p className="lede">
            Audit monthly paid work from submitted lessons and teacher activity
            logs.
          </p>
        </section>

        {query.status === "created" ? (
          <p className="form-success">Paid activity saved.</p>
        ) : null}

        <section className="panel" aria-label="Work summary filters">
          <form className="filter-form compact-filter-form">
            <label>
              <span>Teacher</span>
              <select defaultValue={selectedTeacherId ?? ""} name="teacherId">
                <option value="">All teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                    {teacher.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Month</span>
              <input defaultValue={month.label} name="month" type="month" />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply
              </button>
              <Link className="text-link" href="/admin/work-summary">
                Current month
              </Link>
            </div>
          </form>
        </section>

        <section className="records-review" aria-label="Teacher summaries">
          {summaries.map((summary) => (
            <article className="panel data-panel record-review" key={summary.teacher.id}>
              <div className="record-review-header">
                <div>
                  <p className="eyebrow">Monthly total</p>
                  <h2>{summary.teacher.name}</h2>
                  <p className="muted-copy">
                    {summary.lessons.length} lessons and{" "}
                    {summary.bonusClasses.length} bonus classes and{" "}
                    {summary.workLogs.length} paid activities.
                    {summary.pendingSubstituteLessons.length > 0
                      ? ` ${summary.pendingSubstituteLessons.length} substitute lessons pending approval.`
                      : ""}
                  </p>
                </div>
                <div className="metric compact-metric">
                  <span>{formatHours(summary.totalMinutes)}</span>
                  <strong>Total hours</strong>
                </div>
              </div>

              <div className="metric-grid compact-metrics">
                <article className="metric">
                  <span>{summary.lessons.length}</span>
                  <strong>Lessons</strong>
                </article>
                <article className="metric">
                  <span>{formatHours(summary.lessonMinutes)}</span>
                  <strong>Lesson hours</strong>
                </article>
                <article className="metric">
                  <span>{summary.bonusClasses.length}</span>
                  <strong>Bonus classes</strong>
                </article>
                <article className="metric">
                  <span>{formatHours(summary.bonusClassMinutes)}</span>
                  <strong>Bonus hours</strong>
                </article>
                <article className="metric">
                  <span>{summary.workLogs.length}</span>
                  <strong>Activities</strong>
                </article>
                <article className="metric">
                  <span>{formatHours(summary.workLogMinutes)}</span>
                  <strong>Activity hours</strong>
                </article>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Subject</th>
                  <th>Minutes</th>
                  <th>Created by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.lessons.map((lesson) => (
                      <tr key={lesson.id}>
                        <td>
                          {lesson.substitutionStatus === "APPROVED"
                            ? "Approved substitute"
                            : "Regular lesson"}
                        </td>
                        <td>{formatShortDate(lesson.lessonDate)}</td>
                        <td>
                          {lesson.class.name} | {lesson.name ?? "Untitled"}
                        </td>
                        <td>-</td>
                        <td>{lesson.class.durationMinutes}</td>
                        <td>Class record</td>
                      </tr>
                    ))}
                    {summary.bonusClasses.map((bonusClass) => (
                      <tr key={bonusClass.id}>
                        <td>Completed bonus class</td>
                        <td>{formatShortDate(bonusClass.scheduledDate)}</td>
                        <td>
                          {bonusClass.student.fullName} | {bonusClass.subject} |{" "}
                          {formatStartTime(bonusClass.startTime)}
                        </td>
                        <td>{bonusClass.subject}</td>
                        <td>{bonusClass.durationMinutes}</td>
                        <td>Reception schedule</td>
                      </tr>
                    ))}
                    {summary.workLogs.map((workLog) => (
                      <tr key={workLog.id}>
                        <td>{formatTeacherWorkCategory(workLog.category)}</td>
                        <td>{formatShortDate(workLog.workDate)}</td>
                        <td>{workLog.title}</td>
                        <td>{workLog.subject ?? "-"}</td>
                        <td>{workLog.durationMinutes}</td>
                        <td>{workLog.createdBy.name}</td>
                      </tr>
                    ))}
                    {summary.pendingSubstituteLessons.map((lesson) => (
                      <tr key={lesson.id}>
                        <td>Pending substitute</td>
                        <td>{formatShortDate(lesson.lessonDate)}</td>
                        <td>
                          {lesson.class.name} | {lesson.name ?? "Untitled"}
                        </td>
                        <td>-</td>
                        <td>{lesson.class.durationMinutes}</td>
                        <td>Pending admin approval</td>
                      </tr>
                    ))}
                    {summary.lessons.length +
                      summary.bonusClasses.length +
                      summary.workLogs.length +
                      summary.pendingSubstituteLessons.length ===
                    0 ? (
                      <tr>
                        <td colSpan={6}>No counted work for this month.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>

        <section className="panel data-panel" aria-labelledby="admin-activity-title">
          <h2 id="admin-activity-title">Add activity for a teacher</h2>
          <form action={createTeacherWorkLogAction} className="admin-form">
            <input name="redirectTo" type="hidden" value="/admin/work-summary" />
            <label>
              <span>Teacher</span>
              <select name="teacherId" required>
                <option value="">Choose a teacher</option>
                {teachers
                  .filter((teacher) => teacher.isActive)
                  .map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Category</span>
              <select name="category" required>
                {teacherWorkCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Title</span>
              <input name="title" required type="text" />
            </label>
            <label>
              <span>Subject</span>
              <input
                name="subject"
                placeholder="Required for bonus classes"
                type="text"
              />
            </label>
            <label>
              <span>Date</span>
              <input name="workDate" required type="date" />
            </label>
            <label>
              <span>Start time</span>
              <input name="startTime" type="time" />
            </label>
            <label>
              <span>Duration minutes</span>
              <input min="1" max="720" name="durationMinutes" required type="number" />
            </label>
            <label>
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                Save activity
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
