import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  updateClassAction,
  updateClassRosterAction,
} from "@/app/actions/classes";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import {
  classTypeOptions,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

type EditClassPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function EditClassPage({
  params,
  searchParams,
}: EditClassPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { classId } = await params;
  const t = getTranslations(currentUser.locale);
  const [query, schoolClass, teachers, students] = await Promise.all([
    searchParams,
    prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        classType: true,
        book: true,
        semester: true,
        year: true,
        startTime: true,
        durationMinutes: true,
        weekDays: true,
        isActive: true,
        teacherId: true,
        enrollments: {
          orderBy: {
            student: { fullName: "asc" },
          },
          select: {
            id: true,
            status: true,
            studentId: true,
            student: {
              select: {
                fullName: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),
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
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        isActive: true,
      },
    }),
  ]);

  if (!schoolClass) {
    notFound();
  }
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
        <section className="intro" aria-labelledby="edit-class-title">
          <Link className="text-link" href="/admin/classes">
            {t("adminClasses.backToClasses")}
          </Link>
          <p className="eyebrow">{t("adminClasses.adminSetup")}</p>
          <h1 id="edit-class-title">{t("adminClasses.editClass")}</h1>
          <div className="action-row">
            <Link className="secondary-link" href={`/dashboard/classes/${schoolClass.id}`}>
              {t("adminClasses.openClassPage")}
            </Link>
          </div>
        </section>

        <section className="panel">
          {query.error === "invalid" ? (
            <p className="form-error">{t("adminClasses.invalidError")}</p>
          ) : null}
          {query.error === "schedule" ? (
            <p className="form-error">{t("adminClasses.scheduleError")}</p>
          ) : null}
          {query.error === "class-roster-size" ? (
            <p className="form-error">{t("adminClasses.singleStudentRosterError")}</p>
          ) : null}
          {query.status === "roster-updated" ? (
            <p className="form-success">
              {t("adminClasses.classRosterUpdated")}
            </p>
          ) : null}
          <form action={updateClassAction} className="admin-form">
            <input name="classId" type="hidden" value={schoolClass.id} />
            <label>
              <span>{t("label.name")}</span>
              <input defaultValue={schoolClass.name} name="name" required type="text" />
            </label>
            <label>
              <span>{t("adminClasses.classType")}</span>
              <select defaultValue={schoolClass.classType} name="classType" required>
                {classTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.translationKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("adminClasses.book")}</span>
              <input
                defaultValue={schoolClass.book ?? ""}
                list="book-options"
                name="book"
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
              <select defaultValue={schoolClass.semester ?? ""} name="semester">
                <option value="">{t("adminClasses.noSemester")}</option>
                <option value="1">{t("dashboard.semester")} 1</option>
                <option value="2">{t("dashboard.semester")} 2</option>
              </select>
            </label>
            <label>
              <span>{t("adminClasses.year")}</span>
              <input
                defaultValue={schoolClass.year ?? ""}
                max="2100"
                min="2000"
                name="year"
                type="number"
              />
            </label>
            <label>
              <span>{t("label.startTime")}</span>
              <TimeInput
                defaultValue={schoolClass.startTime ?? ""}
                name="startTime"
              />
            </label>
            <label>
              <span>{t("label.duration")}</span>
              <DurationInput
                maxMinutes={600}
                name="durationMinutes"
                required
                valueMinutes={schoolClass.durationMinutes}
              />
            </label>
            <div>
              <span className="form-section-label">
                {t("receptionLookup.weekdays")}
              </span>
              <div className="weekday-picker">
                {weekdayOptions.map((weekday) => (
                  <label className="checkbox-label" key={weekday.value}>
                    <input
                      defaultChecked={schoolClass.weekDays.includes(weekday.value)}
                      name="weekDays"
                      type="checkbox"
                      value={weekday.value}
                    />
                    <span>
                      {formatWeekdays([weekday.value], currentUser.locale)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label>
              <span>{t("label.teacher")}</span>
              <select defaultValue={schoolClass.teacherId} name="teacherId" required>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={schoolClass.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>{t("adminClasses.activeClass")}</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/classes">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("adminClasses.saveClass")}
              </button>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="roster-title">
          {query.error === "roster" ? (
            <p className="form-error">{t("adminClasses.chooseActiveRoster")}</p>
          ) : null}
          {query.error === "roster-size" ? (
            <p className="form-error">{t("adminClasses.singleStudentRosterError")}</p>
          ) : null}
          {query.error === "roster-schedule" ? (
            <p className="form-error">{t("adminClasses.scheduleError")}</p>
          ) : null}
          <h2 id="roster-title">{t("adminClasses.classRoster")}</h2>
          <form action={updateClassRosterAction} className="admin-form">
            <input name="classId" type="hidden" value={schoolClass.id} />
            <RosterPicker
              emptyMessage={t("adminClasses.noStudentsCreated")}
              labels={rosterLabels}
              students={students.map((student) => {
                const enrollment = schoolClass.enrollments.find(
                  (item) => item.studentId === student.id,
                );

                return {
                  ...student,
                  isEnrolled: enrollment?.status === "ACTIVE",
                };
              })}
            />
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("adminClasses.saveRoster")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
