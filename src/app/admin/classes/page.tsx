import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { formatEntityResultMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import type { Prisma, Weekday } from "@/generated/prisma/client";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type AdminClassesPageProps = {
  searchParams: Promise<{
    classStatus?: string;
    semester?: string;
    status?: string;
    student?: string;
    teacherId?: string;
    weekDay?: string | string[];
    year?: string;
  }>;
};

type ClassStatusFilter = "all" | "active" | "inactive";

function formatTerm(
  semester: number | null,
  year: number | null,
  t: ReturnType<typeof getTranslations>,
) {
  if (!semester || !year) {
    return "-";
  }

  return `${t("dashboard.semester")} ${semester}/${year}`;
}

function formatClassType(
  classType: string,
  t: ReturnType<typeof getTranslations>,
) {
  switch (classType) {
    case "VIP":
      return t("classType.vip");
    case "PERSONAL":
      return t("classType.personal");
    default:
      return t("classType.regular");
  }
}

function readFilterValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function readNumberFilter(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  return Number(value);
}

function readClassStatusFilter(value: string | undefined): ClassStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }

  return value === "all" ? "all" : "active";
}

function readWeekdayFilters(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const allowedWeekdays = new Set<string>(
    weekdayOptions.map((option) => option.value),
  );

  return values.filter((item): item is Weekday => allowedWeekdays.has(item));
}

export default async function AdminClassesPage({
  searchParams,
}: AdminClassesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const t = getTranslations(currentUser.locale);
  const currentYear = new Date().getUTCFullYear();
  const classStatus = readClassStatusFilter(readFilterValue(params.classStatus));
  const semester = readNumberFilter(params.semester);
  const studentSearch = readFilterValue(params.student);
  const teacherId = readFilterValue(params.teacherId);
  const weekDays = readWeekdayFilters(params.weekDay);
  const year =
    readFilterValue(params.year) === undefined
      ? currentYear
      : readNumberFilter(params.year);
  const successMessage = formatEntityResultMessage(
    "Class",
    params.status,
    currentUser.locale,
  );

  const classWhere: Prisma.ClassWhereInput = {
    ...(classStatus === "active" ? { isActive: true } : {}),
    ...(classStatus === "inactive" ? { isActive: false } : {}),
    ...(semester ? { semester } : {}),
    ...(teacherId ? { teacherId } : {}),
    ...(weekDays.length > 0 ? { weekDays: { hasSome: weekDays } } : {}),
    ...(year ? { year } : {}),
    ...(studentSearch
      ? {
          enrollments: {
            some: {
              student: {
                fullName: {
                  contains: studentSearch,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        }
      : {}),
  };

  const classes = await prisma.class.findMany({
    where: classWhere,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
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
      teacher: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          lessons: true,
        },
      },
    },
  });

  const [teachers, years, students] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.class.findMany({
      distinct: ["year"],
      orderBy: { year: "desc" },
      where: {
        year: {
          not: null,
        },
      },
      select: {
        year: true,
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
      },
      take: 200,
    }),
  ]);
  const yearOptions = Array.from(
    new Set([
      currentYear,
      ...years
        .map((item) => item.year)
        .filter((item): item is number => Boolean(item)),
    ]),
  ).sort((a, b) => b - a);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="classes-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("adminClasses.adminSetup")}</p>
          <h1 id="classes-title">{t("dashboard.classes")}</h1>
          <p className="lede">{t("adminClasses.createCopy")}</p>
          <div className="action-row">
            <Link className="secondary-link" href="/admin/classes/import">
              {t("imports.importClasses")}
            </Link>
            <Link className="primary-link" href="/admin/classes/new">
              {t("adminClasses.createClass")}
            </Link>
          </div>
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <section
          className="panel filter-panel"
          aria-label={t("dashboard.classFilters")}
        >
          <div className="filter-panel-heading">
            <div>
              <h2>{t("adminClasses.filterClasses")}</h2>
              <p className="muted-copy">{t("adminClasses.filterCopy")}</p>
            </div>
            <span className="status-pill">
              {classes.length}{" "}
              {classes.length === 1
                ? t("adminClasses.classFound")
                : t("adminClasses.classesFound")}
            </span>
          </div>
          <form className="filter-form class-filter-form">
            <label className="wide-filter">
              <span>{t("label.teacher")}</span>
              <select defaultValue={teacherId ?? ""} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide-filter">
              <span>{t("label.student")}</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="admin-class-students"
                name="student"
                placeholder={t("adminClasses.searchEnrolledStudents")}
                type="search"
              />
              <datalist id="admin-class-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <label>
              <span>{t("label.status")}</span>
              <select defaultValue={classStatus} name="classStatus">
                <option value="all">{t("adminClasses.allStatuses")}</option>
                <option value="active">{t("label.active")}</option>
                <option value="inactive">{t("label.inactive")}</option>
              </select>
            </label>
            <label>
              <span>{t("adminClasses.year")}</span>
              <select defaultValue={year ?? ""} name="year">
                <option value="">{t("adminClasses.allYears")}</option>
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("dashboard.semester")}</span>
              <select defaultValue={semester ?? ""} name="semester">
                <option value="">{t("adminClasses.allSemesters")}</option>
                <option value="1">{t("dashboard.semester")} 1</option>
                <option value="2">{t("dashboard.semester")} 2</option>
              </select>
            </label>
            <div className="weekday-filter wide-filter">
              <span className="form-section-label">{t("adminClasses.days")}</span>
              <div className="weekday-picker compact-weekday-picker">
                {weekdayOptions.map((weekday) => (
                  <label className="checkbox-label" key={weekday.value}>
                    <input
                      defaultChecked={weekDays.includes(weekday.value)}
                      name="weekDay"
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
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.applyFilters")}
              </button>
              <Link className="text-link" href="/admin/classes">
                {t("label.clear")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="admin-class-results-title">
          <div className="section-heading-row">
            <div>
              <h2 id="admin-class-results-title">
                {t("adminClasses.classResults")}
              </h2>
              <p className="muted-copy">
                {classes.length}{" "}
                {classes.length === 1
                  ? t("adminClasses.classFound")
                  : t("adminClasses.classesFound")}
              </p>
            </div>
          </div>
          <div className="class-result-grid">
            {classes.map((schoolClass) => (
              <Link
                className="class-result-card"
                href={`/admin/classes/${schoolClass.id}`}
                key={schoolClass.id}
              >
                <span>{schoolClass.teacher.name}</span>
                <strong>{schoolClass.name}</strong>
                <small>
                  {formatClassType(schoolClass.classType, t)} |{" "}
                  {schoolClass.book ?? t("adminClasses.noBook")} |{" "}
                  {formatTerm(schoolClass.semester, schoolClass.year, t)}
                </small>
                <small>
                  {formatWeekdays(schoolClass.weekDays, currentUser.locale)} |{" "}
                  {schoolClass.startTime ?? "-"}
                </small>
                <div className="class-result-card-metrics">
                  <span>
                    {schoolClass.isActive ? t("label.active") : t("label.inactive")}
                  </span>
                  <span>
                    {schoolClass._count.enrollments} {t("label.students")}
                  </span>
                  <span>
                    {schoolClass._count.lessons} {t("label.lessons")}
                  </span>
                  <span>{formatDuration(schoolClass.durationMinutes)}</span>
                </div>
              </Link>
            ))}
            {classes.length === 0 ? (
              <p className="muted-copy">{t("adminClasses.noClassesMatch")}</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
