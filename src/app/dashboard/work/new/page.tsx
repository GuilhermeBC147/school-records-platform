import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherWorkLogAction } from "@/app/actions/teacher-work";
import { logoutAction } from "@/app/actions/auth";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { formatTeacherWorkErrorMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { teacherWorkCategories } from "@/lib/teacher-work";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type NewTeacherActivityPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewTeacherActivityPage({
  searchParams,
}: NewTeacherActivityPageProps) {
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
  const query = await searchParams;
  const errorMessage = formatTeacherWorkErrorMessage(query.error);
  const students = await prisma.student.findMany({
    orderBy: { fullName: "asc" },
    where: { isActive: true },
    select: {
      fullName: true,
      id: true,
      isActive: true,
    },
  });

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
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={createTeacherWorkLogAction} className="admin-form">
            <input name="redirectTo" type="hidden" value="/dashboard/work" />
            <input
              name="errorRedirectTo"
              type="hidden"
              value="/dashboard/work/new"
            />
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
              <TimeInput name="startTime" />
            </label>
            <label>
              <span>Duration</span>
              <DurationInput name="durationMinutes" required />
            </label>
            <div>
              <span className="form-section-label">Students</span>
              <RosterPicker
                emptyMessage="No active students yet."
                students={students}
              />
            </div>
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
