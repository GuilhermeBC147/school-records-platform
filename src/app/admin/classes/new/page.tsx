import Link from "next/link";
import { redirect } from "next/navigation";
import { createClassAction } from "@/app/actions/classes";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { DurationInput } from "@/app/components/duration-input";
import { formatWeekdays, weekdayOptions } from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

type NewClassPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewClassPage({ searchParams }: NewClassPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [params, teachers, students] = await Promise.all([
    searchParams,
    prisma.user.findMany({
      where: {
        role: "TEACHER",
        isActive: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
      },
    }),
  ]);
  const t = getTranslations(currentUser.locale);
  const rosterLabels = {
    inactive: t("label.inactive"),
    noMatches: t("adminClasses.noStudentsMatchSearch"),
    search: t("adminClasses.searchStudents"),
    searchHint: t("adminClasses.rosterSearchHint"),
    searchPlaceholder: t("receptionLookup.studentSearchPlaceholder"),
    selected: t("adminClasses.selected"),
    shown: t("adminClasses.shown"),
  };

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="new-class-title">
          <Link className="text-link" href="/admin/classes">
            {t("adminClasses.backToClasses")}
          </Link>
          <p className="eyebrow">{t("adminClasses.adminSetup")}</p>
          <h1 id="new-class-title">{t("adminClasses.createClass")}</h1>
        </section>

        <section className="panel">
          {params.error === "invalid" ? (
            <p className="form-error">{t("adminClasses.invalidError")}</p>
          ) : null}
          <form action={createClassAction} className="admin-form">
            <label>
              <span>{t("label.name")}</span>
              <input
                name="name"
                placeholder={t("adminClasses.namePlaceholder")}
                required
                type="text"
              />
            </label>
            <label>
              <span>{t("adminClasses.book")}</span>
              <input
                list="book-options"
                name="book"
                placeholder={t("adminClasses.bookPlaceholder")}
                type="text"
              />
            </label>
            <datalist id="book-options">
              <option value="Book 1" />
              <option value="Book 2" />
              <option value="Book 3" />
              <option value="Junior 1" />
              <option value="Junior 2" />
              <option value="Junior 3" />
            </datalist>
            <label>
              <span>{t("dashboard.semester")}</span>
              <select name="semester">
                <option value="">{t("adminClasses.noSemester")}</option>
                <option value="1">{t("dashboard.semester")} 1</option>
                <option value="2">{t("dashboard.semester")} 2</option>
              </select>
            </label>
            <label>
              <span>{t("adminClasses.year")}</span>
              <input name="year" placeholder="2026" type="number" min="2000" max="2100" />
            </label>
            <label>
              <span>{t("label.duration")}</span>
              <DurationInput
                maxMinutes={600}
                name="durationMinutes"
                required
                valueMinutes={60}
              />
            </label>
            <div>
              <span className="form-section-label">
                {t("receptionLookup.weekdays")}
              </span>
              <div className="weekday-picker">
                {weekdayOptions.map((weekday) => (
                  <label className="checkbox-label" key={weekday.value}>
                    <input name="weekDays" type="checkbox" value={weekday.value} />
                    <span>
                      {formatWeekdays([weekday.value], currentUser.locale)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label>
              <span>{t("label.teacher")}</span>
              <select name="teacherId" required>
                <option value="">{t("label.chooseTeacher")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="isActive" type="checkbox" />
              <span>{t("adminClasses.activeClass")}</span>
            </label>
            <div>
              <span className="form-section-label">
                {t("adminClasses.classRoster")}
              </span>
              <RosterPicker
                emptyMessage={t("adminClasses.rosterEmptyCreate")}
                labels={rosterLabels}
                students={students.map((student) => ({
                  ...student,
                  isActive: true,
                }))}
              />
            </div>
            <div className="record-actions">
              <Link className="text-link" href="/admin/classes">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("adminClasses.createClass")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
