import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDate } from "@/lib/date-format";
import { formatStartTime } from "@/lib/bonus-classes";
import {
  formatHours,
  formatTeacherWorkCategory,
  getTeacherWorkSummary,
  readMonth,
} from "@/lib/teacher-work";
import { getCurrentUser } from "@/lib/session";

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
        <section className="intro" aria-labelledby="work-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Teacher work</p>
          <h1 id="work-title">Monthly summary</h1>
          <p className="lede">
            Submitted class lessons count automatically. Activities logged from
            the separate activity page are included here.
          </p>
          <div className="action-row">
            <Link className="primary-link" href="/dashboard/work/new">
              Add event
            </Link>
          </div>
          <div className="metric-grid">
            <article className="metric">
              <span>{summary.lessons.length}</span>
              <strong>Lessons</strong>
            </article>
            <article className="metric">
              <span>{summary.workLogs.length}</span>
              <strong>Activities</strong>
            </article>
            <article className="metric">
              <span>{summary.bonusClasses.length}</span>
              <strong>Bonus classes</strong>
            </article>
            <article className="metric">
              <span>{summary.pendingSubstituteLessons.length}</span>
              <strong>Pending substitutions</strong>
            </article>
            <article className="metric">
              <span>{formatHours(summary.lessonMinutes)}</span>
              <strong>Lesson hours</strong>
            </article>
            <article className="metric">
              <span>{formatHours(summary.totalMinutes)}</span>
              <strong>Total hours</strong>
            </article>
          </div>
        </section>

        {query.status === "created" ? (
          <p className="form-success">Paid activity saved.</p>
        ) : null}
        {query.status === "substitution-pending" ? (
          <p className="form-success">
            Substitute lesson submitted for admin approval.
          </p>
        ) : null}

        <section className="panel" aria-label="Summary filters">
          <form className="filter-form compact-filter-form">
            <label>
              <span>Month</span>
              <input defaultValue={month.label} name="month" type="month" />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply
              </button>
              <Link className="text-link" href="/dashboard/work">
                Current month
              </Link>
            </div>
          </form>
        </section>

        <section className="data-grid" aria-label="Monthly details">
          <article className="panel data-panel">
            <h2>Submitted lessons</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Lesson</th>
                    <th>Type</th>
                    <th>Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{formatShortDate(lesson.lessonDate)}</td>
                      <td>{lesson.class.name}</td>
                      <td>{lesson.name ?? "-"}</td>
                      <td>
                        {lesson.substitutionStatus === "APPROVED"
                          ? `Approved substitute for ${lesson.class.teacher.name}`
                          : "Regular lesson"}
                      </td>
                      <td>{lesson.class.durationMinutes}</td>
                    </tr>
                  ))}
                  {summary.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No submitted lessons this month.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>Completed bonus classes</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bonusClasses.map((bonusClass) => (
                    <tr key={bonusClass.id}>
                      <td>{formatShortDate(bonusClass.scheduledDate)}</td>
                      <td>{formatStartTime(bonusClass.startTime)}</td>
                      <td>{bonusClass.student.fullName}</td>
                      <td>{bonusClass.subject}</td>
                      <td>{bonusClass.durationMinutes}</td>
                    </tr>
                  ))}
                  {summary.bonusClasses.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No completed bonus classes this month.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>Paid activities</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.workLogs.map((workLog) => (
                    <tr key={workLog.id}>
                      <td>{formatShortDate(workLog.workDate)}</td>
                      <td>{formatTeacherWorkCategory(workLog.category)}</td>
                      <td>{workLog.title}</td>
                      <td>{workLog.subject ?? "-"}</td>
                      <td>{workLog.durationMinutes}</td>
                    </tr>
                  ))}
                  {summary.workLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No paid activities this month.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        {summary.pendingSubstituteLessons.length > 0 ? (
          <section className="panel data-panel" aria-labelledby="pending-substitutions-title">
            <h2 id="pending-substitutions-title">Pending substitute lessons</h2>
            <p className="muted-copy">
              These records are saved, but their hours are not included in the
              finalized total until an admin approves them.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Primary teacher</th>
                    <th>Lesson</th>
                    <th>Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pendingSubstituteLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{formatShortDate(lesson.lessonDate)}</td>
                      <td>{lesson.class.name}</td>
                      <td>{lesson.class.teacher.name}</td>
                      <td>{lesson.name ?? "-"}</td>
                      <td>{lesson.class.durationMinutes}</td>
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
