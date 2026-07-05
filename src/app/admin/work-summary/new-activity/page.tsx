import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherWorkLogAction } from "@/app/actions/teacher-work";
import { logoutAction } from "@/app/actions/auth";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { teacherWorkCategories } from "@/lib/teacher-work";

export const dynamic = "force-dynamic";

export default async function NewAdminActivityPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [teachers, students] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: { isActive: true, role: "TEACHER" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      where: { isActive: true },
      select: {
        fullName: true,
        id: true,
        isActive: true,
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
        <section className="intro" aria-labelledby="admin-activity-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin work</p>
          <h1 id="admin-activity-title">Add activity</h1>
          <p className="lede">
            Record a paid activity for one teacher and optionally connect it to
            one or more students.
          </p>
        </section>

        <section className="panel data-panel" aria-label="Activity form">
          <form action={createTeacherWorkLogAction} className="admin-form">
            <input name="redirectTo" type="hidden" value="/admin/work-summary" />
            <label>
              <span>Teacher</span>
              <select name="teacherId" required>
                <option value="">Choose a teacher</option>
                {teachers.map((teacher) => (
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
              <Link className="text-link" href="/admin/work-summary">
                Cancel
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
