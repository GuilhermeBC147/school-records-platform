import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherWorkLogAction } from "@/app/actions/teacher-work";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDate } from "@/lib/date-format";
import {
  formatHours,
  formatTeacherWorkCategory,
  getTeacherWorkSummary,
  readMonth,
  teacherWorkCategories,
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
            Submitted class lessons count automatically. Add paid activities
            that happen outside regular class records.
          </p>
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
                    <th>Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{formatShortDate(lesson.lessonDate)}</td>
                      <td>{lesson.class.name}</td>
                      <td>{lesson.name ?? "-"}</td>
                      <td>{lesson.class.durationMinutes}</td>
                    </tr>
                  ))}
                  {summary.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No submitted lessons this month.</td>
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
                    <th>Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.workLogs.map((workLog) => (
                    <tr key={workLog.id}>
                      <td>{formatShortDate(workLog.workDate)}</td>
                      <td>{formatTeacherWorkCategory(workLog.category)}</td>
                      <td>{workLog.title}</td>
                      <td>{workLog.durationMinutes}</td>
                    </tr>
                  ))}
                  {summary.workLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No paid activities this month.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="intro" aria-labelledby="activity-title">
          <p className="eyebrow">Teacher work</p>
          <h1 id="activity-title">Add activity</h1>
          <p className="lede">
            Record bonus classes, extra activities, meetings, or other paid
            work that should be counted this month.
          </p>
        </section>

        <section className="panel data-panel" aria-label="Activity form">
          <form action={createTeacherWorkLogAction} className="admin-form">
            <input name="redirectTo" type="hidden" value="/dashboard/work" />
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
