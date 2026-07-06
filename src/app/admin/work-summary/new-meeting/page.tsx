import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherMeetingAction } from "@/app/actions/teacher-work";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { formatTeacherWorkErrorMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

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
  const t = getTranslations(currentUser.locale);
  const errorMessage = formatTeacherWorkErrorMessage(
    query.error,
    currentUser.locale,
  );
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
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="admin-meeting-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.adminWork")}</p>
          <h1 id="admin-meeting-title">{t("dashboard.createMeeting")}</h1>
          <p className="lede">{t("text.adminMeetingCopy")}</p>
        </section>

        <section className="panel data-panel" aria-label={t("dashboard.createMeeting")}>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={createTeacherMeetingAction} className="admin-form">
            <input
              name="errorRedirectTo"
              type="hidden"
              value="/admin/work-summary/new-meeting"
            />
            <label>
              <span>{t("label.teachers")}</span>
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
              <span>{t("label.title")}</span>
              <input name="title" required type="text" />
            </label>
            <label>
              <span>{t("label.date")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                name="workDate"
                required
              />
            </label>
            <label>
              <span>{t("label.startTime")}</span>
              <TimeInput name="startTime" />
            </label>
            <label>
              <span>{t("label.duration")}</span>
              <DurationInput name="durationMinutes" required />
            </label>
            <label>
              <span>{t("label.notes")}</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/work-summary">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("label.saveMeeting")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
