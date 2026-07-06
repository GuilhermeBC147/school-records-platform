import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherMeetingAction } from "@/app/actions/teacher-work";
import { logoutAction } from "@/app/actions/auth";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { formatTeacherWorkErrorMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type NewAdminMeetingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewAdminMeetingPage({
  searchParams,
}: NewAdminMeetingPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const errorMessage = formatTeacherWorkErrorMessage(query.error);
  const teachers = await prisma.user.findMany({
    orderBy: { name: "asc" },
    where: { isActive: true, role: "TEACHER" },
    select: {
      id: true,
      name: true,
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
        <section className="intro" aria-labelledby="admin-meeting-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin work</p>
          <h1 id="admin-meeting-title">Create meeting</h1>
          <p className="lede">
            Count one meeting toward each selected teacher's monthly hours.
          </p>
        </section>

        <section className="panel data-panel" aria-label="Meeting form">
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={createTeacherMeetingAction} className="admin-form">
            <input
              name="errorRedirectTo"
              type="hidden"
              value="/admin/work-summary/new-meeting"
            />
            <label>
              <span>Teachers</span>
              <div className="roster-list compact-roster-list">
                {teachers.map((teacher) => (
                  <label className="checkbox-label roster-student" key={teacher.id}>
                    <input name="teacherIds" type="checkbox" value={teacher.id} />
                    <span>{teacher.name}</span>
                  </label>
                ))}
              </div>
            </label>
            <label>
              <span>Title</span>
              <input name="title" required type="text" />
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
            <label>
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/work-summary">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Save meeting
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
