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
  const classStatus =
    readFilterValue(params.classStatus) === "inactive" ? "inactive" : "active";
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

  const [teachers, years] = await Promise.all([
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

        <section className="panel" aria-label="Class filters">
          <form className="filter-form class-filter-form">
            <label>
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
            <label>
              <span>Student</span>
              <input
                defaultValue={studentSearch ?? ""}
                name="student"
                placeholder="Search enrolled students"
                type="search"
              />
            </label>
            <label>
              <span>Status</span>
              <select defaultValue={classStatus} name="classStatus">
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
            <div>
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

        <section className="panel data-panel" aria-label="Classes">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Book</th>
                  <th>Term</th>
                  <th>Schedule</th>
                  <th>Duration</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Students</th>
                  <th>Lessons</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((schoolClass) => (
                  <tr key={schoolClass.id}>
                    <td>{schoolClass.name}</td>
                    <td>{schoolClass.book ?? "-"}</td>
                    <td>{formatTerm(schoolClass.semester, schoolClass.year)}</td>
                    <td>{formatWeekdays(schoolClass.weekDays)}</td>
                    <td>{formatDuration(schoolClass.durationMinutes)}</td>
                    <td>{schoolClass.teacher.name}</td>
                    <td>{schoolClass.isActive ? "Active" : "Inactive"}</td>
                    <td>{schoolClass._count.enrollments}</td>
                    <td>{schoolClass._count.lessons}</td>
                    <td>
                      <Link
                        className="text-link compact-link"
                        href={`/admin/classes/${schoolClass.id}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No classes match the current filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
