import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Prisma, Weekday } from "@/generated/prisma/client";

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

function formatTerm(semester: number | null, year: number | null) {
  if (!semester || !year) {
    return "-";
  }

  return `Semester ${semester}/${year}`;
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

  return "all";
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
  const classStatus = readClassStatusFilter(readFilterValue(params.classStatus));
  const semester = readNumberFilter(params.semester);
  const studentSearch = readFilterValue(params.student);
  const teacherId = readFilterValue(params.teacherId);
  const weekDays = readWeekdayFilters(params.weekDay);
  const year = readNumberFilter(params.year);

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
      book: true,
      semester: true,
      year: true,
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
        <section className="intro" aria-labelledby="classes-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="classes-title">Classes</h1>
          <p className="lede">
            Create classes, assign teachers, and control which classes are
            active for teacher dashboards.
          </p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/classes/new">
              Create class
            </Link>
          </div>
        </section>

        {params.status ? (
          <p className="form-success">
            Class {params.status === "created" ? "created" : "updated"}.
          </p>
        ) : null}

        <section className="panel filter-panel" aria-label="Class filters">
          <div className="filter-panel-heading">
            <div>
              <h2>Filter classes</h2>
              <p className="muted-copy">
                Combine teacher, student, schedule, term, and status filters.
              </p>
            </div>
            <span className="status-pill">{classes.length} found</span>
          </div>
          <form className="filter-form class-filter-form">
            <label className="wide-filter">
              <span>Teacher</span>
              <select defaultValue={teacherId ?? ""} name="teacherId">
                <option value="">All teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide-filter">
              <span>Student</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="admin-class-students"
                name="student"
                placeholder="Search enrolled students"
                type="search"
              />
              <datalist id="admin-class-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <label>
              <span>Status</span>
              <select defaultValue={classStatus} name="classStatus">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              <span>Year</span>
              <select defaultValue={year ?? ""} name="year">
                <option value="">All years</option>
                {years.map((item) =>
                  item.year ? (
                    <option key={item.year} value={item.year}>
                      {item.year}
                    </option>
                  ) : null,
                )}
              </select>
            </label>
            <label>
              <span>Semester</span>
              <select defaultValue={semester ?? ""} name="semester">
                <option value="">All semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>
            <div className="weekday-filter wide-filter">
              <span className="form-section-label">Days</span>
              <div className="weekday-picker compact-weekday-picker">
                {weekdayOptions.map((weekday) => (
                  <label className="checkbox-label" key={weekday.value}>
                    <input
                      defaultChecked={weekDays.includes(weekday.value)}
                      name="weekDay"
                      type="checkbox"
                      value={weekday.value}
                    />
                    <span>{weekday.shortLabel}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply filters
              </button>
              <Link className="text-link" href="/admin/classes">
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="admin-class-results-title">
          <div className="section-heading-row">
            <div>
              <h2 id="admin-class-results-title">Class results</h2>
              <p className="muted-copy">
                {classes.length} {classes.length === 1 ? "class" : "classes"} found.
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
                  {schoolClass.book ?? "No book"} |{" "}
                  {formatTerm(schoolClass.semester, schoolClass.year)}
                </small>
                <small>{formatWeekdays(schoolClass.weekDays)}</small>
                <div className="class-result-card-metrics">
                  <span>{schoolClass.isActive ? "Active" : "Inactive"}</span>
                  <span>{schoolClass._count.enrollments} students</span>
                  <span>{schoolClass._count.lessons} lessons</span>
                  <span>{formatDuration(schoolClass.durationMinutes)}</span>
                </div>
              </Link>
            ))}
            {classes.length === 0 ? (
              <p className="muted-copy">No classes match the current filters.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
