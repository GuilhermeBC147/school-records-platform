import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherWorkLogAction } from "@/app/actions/teacher-work";
import { logoutAction } from "@/app/actions/auth";
import { DateInput } from "@/app/components/date-input";
import { teacherWorkCategories } from "@/lib/teacher-work";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewTeacherActivityPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/admin/work-summary");
  }

  const teacherCreatedCategories = teacherWorkCategories.filter(
    (category) => category.value !== "MEETING",
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
        <section className="intro" aria-labelledby="activity-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Teacher work</p>
          <h1 id="activity-title">Add event</h1>
          <p className="lede">
            Record bonus classes, extra activities, or other paid work that
            should be counted in your monthly summary.
          </p>
        </section>

        <section className="panel data-panel" aria-label="Activity form">
          <form action={createTeacherWorkLogAction} className="admin-form">
            <input name="redirectTo" type="hidden" value="/dashboard/work" />
            <label>
              <span>Category</span>
              <select name="category" required>
                {teacherCreatedCategories.map((category) => (
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
              <DateInput
                dateFormat={currentUser.dateFormat}
                name="workDate"
                required
              />
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
              <Link className="text-link" href="/dashboard/work">
                View summary
              </Link>
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
