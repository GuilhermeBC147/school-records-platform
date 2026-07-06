import Link from "next/link";
import { redirect } from "next/navigation";
import { createTeacherWorkLogAction } from "@/app/actions/teacher-work";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { formatTeacherWorkErrorMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import {
  formatTeacherWorkCategory,
  teacherWorkCategories,
} from "@/lib/teacher-work";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

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
  const t = getTranslations(currentUser.locale);
  const errorMessage = formatTeacherWorkErrorMessage(
    query.error,
    currentUser.locale,
  );
  const rosterLabels = {
    inactive: t("label.inactive"),
    noMatches: t("adminClasses.noStudentsMatchSearch"),
    search: t("adminClasses.searchStudents"),
    searchHint: t("adminClasses.rosterSearchHint"),
    searchPlaceholder: t("receptionLookup.studentSearchPlaceholder"),
    selected: t("adminClasses.selected"),
    shown: t("adminClasses.shown"),
  };
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
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="activity-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.teacherWork")}</p>
          <h1 id="activity-title">{t("dashboard.addActivity")}</h1>
          <p className="lede">{t("text.teacherActivityCopy")}</p>
        </section>

        <section className="panel data-panel" aria-label={t("dashboard.addActivity")}>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={createTeacherWorkLogAction} className="admin-form">
            <input name="redirectTo" type="hidden" value="/dashboard/work" />
            <input
              name="errorRedirectTo"
              type="hidden"
              value="/dashboard/work/new"
            />
            <label>
              <span>{t("label.category")}</span>
              <select name="category" required>
                {teacherCreatedCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {formatTeacherWorkCategory(category.value, currentUser.locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.title")}</span>
              <input name="title" required type="text" />
            </label>
            <label>
              <span>{t("label.subject")}</span>
              <input
                name="subject"
                placeholder={t("text.teacherWorkSubjectPlaceholder")}
                type="text"
              />
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
            <div>
              <span className="form-section-label">{t("label.students")}</span>
              <RosterPicker
                emptyMessage={t("message.noActiveStudentsYet")}
                labels={rosterLabels}
                students={students}
              />
            </div>
            <label>
              <span>{t("label.notes")}</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/dashboard/work">
                {t("label.viewSummary")}
              </Link>
              <button className="primary-button" type="submit">
                {t("label.saveActivity")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
