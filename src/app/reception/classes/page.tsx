import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Weekday } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type ReceptionClassesPageProps = {
  searchParams: Promise<{
    classId?: string;
    classSearch?: string;
    teacherId?: string;
    weekDay?: string | string[];
  }>;
};

function readWeekdayFilters(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const allowedWeekdays = new Set<string>(
    weekdayOptions.map((option) => option.value),
  );

  return values.filter((item): item is Weekday => allowedWeekdays.has(item));
}

function buildClassHref(filters: {
  classId: string;
  classSearch?: string;
  teacherId?: string;
  weekDays: Weekday[];
}) {
  const params = new URLSearchParams({ classId: filters.classId });

  if (filters.classSearch) {
    params.set("classSearch", filters.classSearch);
  }

  if (filters.teacherId) {
    params.set("teacherId", filters.teacherId);
  }

  for (const weekDay of filters.weekDays) {
    params.append("weekDay", weekDay);
  }

  return `/reception/classes?${params.toString()}`;
}

export default async function ReceptionClassesPage({
  searchParams,
}: ReceptionClassesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const classSearch = query.classSearch?.trim() || undefined;
  const selectedTeacherId = query.teacherId?.trim() || undefined;
  const selectedWeekDays = readWeekdayFilters(query.weekDay);

  const [classes, teachers, classOptions] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      where: {
        isActive: true,
        ...(classSearch
          ? { name: { contains: classSearch, mode: "insensitive" } }
          : {}),
        ...(selectedTeacherId ? { teacherId: selectedTeacherId } : {}),
        ...(selectedWeekDays.length > 0
          ? { weekDays: { hasSome: selectedWeekDays } }
          : {}),
      },
      take: 60,
      select: {
        id: true,
        book: true,
        durationMinutes: true,
        name: true,
        semester: true,
        weekDays: true,
        year: true,
        teacher: { select: { email: true, name: true } },
        enrollments: {
          where: { status: "ACTIVE", student: { isActive: true } },
          orderBy: { student: { fullName: "asc" } },
          select: {
            id: true,
            student: { select: { fullName: true } },
          },
        },
        lessons: {
          orderBy: { lessonDate: "desc" },
          take: 5,
          where: { status: "SUBMITTED" },
          select: { id: true, lessonDate: true, name: true },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: { isActive: true, role: "TEACHER" },
      select: { id: true, name: true },
    }),
    prisma.class.findMany({
      orderBy: { name: "asc" },
      where: { isActive: true },
      take: 200,
      select: { id: true, name: true },
    }),
  ]);
  const selectedClass = query.classId
    ? classes.find((schoolClass) => schoolClass.id === query.classId)
    : null;

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
          <Link className="text-link" href="/reception">
            Back to reception
          </Link>
          <p className="eyebrow">Reception</p>
          <h1 id="classes-title">Classes</h1>
          <p className="lede">
            Filter active classes by name, teacher, or weekday and review roster
            and recent lessons.
          </p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          ) : null}
        </section>

        <section className="panel" aria-label="Class filters">
          <form className="filter-form class-lookup-filter-form">
            <label>
              <span>Class search</span>
              <input
                defaultValue={classSearch ?? ""}
                list="reception-classes"
                name="classSearch"
                placeholder="Type a class name"
                type="search"
              />
              <datalist id="reception-classes">
                {classOptions.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.name} />
                ))}
              </datalist>
            </label>
            <label>
              <span>Teacher</span>
              <select defaultValue={selectedTeacherId ?? ""} name="teacherId">
                <option value="">All teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="weekday-filter">
              <span className="form-section-label">Weekdays</span>
              <div className="weekday-picker compact-weekday-picker">
                {weekdayOptions.map((weekday) => (
                  <label className="checkbox-label" key={weekday.value}>
                    <input
                      defaultChecked={selectedWeekDays.includes(weekday.value)}
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
                Search
              </button>
              <Link className="text-link" href="/reception/classes">
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="class-results-title">
          <div className="section-heading-row">
            <div>
              <h2 id="class-results-title">Class results</h2>
              <p className="muted-copy">
                {classes.length} active {classes.length === 1 ? "class" : "classes"} found.
              </p>
            </div>
          </div>
          <div className="class-result-grid">
            {classes.map((schoolClass) => (
              <Link
                className={`class-result-card${
                  selectedClass?.id === schoolClass.id ? " selected" : ""
                }`}
                href={buildClassHref({
                  classId: schoolClass.id,
                  classSearch,
                  teacherId: selectedTeacherId,
                  weekDays: selectedWeekDays,
                })}
                key={schoolClass.id}
              >
                <span>{schoolClass.teacher.name}</span>
                <strong>{schoolClass.name}</strong>
                <small>{formatWeekdays(schoolClass.weekDays)}</small>
                <div className="class-result-card-metrics">
                  <span>{schoolClass.enrollments.length} students</span>
                  <span>{formatDuration(schoolClass.durationMinutes)}</span>
                </div>
              </Link>
            ))}
            {classes.length === 0 ? (
              <p className="muted-copy">No active classes match the current filters.</p>
            ) : null}
          </div>
        </section>

        {selectedClass ? (
          <section className="panel data-panel" aria-labelledby="class-summary-title">
            <div className="section-heading-row">
              <div>
                <h2 id="class-summary-title">{selectedClass.name}</h2>
                <p className="muted-copy">
                  {selectedClass.book ?? "Class"}
                  {selectedClass.semester && selectedClass.year
                    ? ` | Semester ${selectedClass.semester}/${selectedClass.year}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="metric-grid compact-metrics">
              <article className="metric">
                <span>{selectedClass.enrollments.length}</span>
                <strong>Active students</strong>
              </article>
              <article className="metric">
                <span>{selectedClass.lessons.length}</span>
                <strong>Recent lessons</strong>
              </article>
            </div>
            <div className="class-detail-grid">
              <article className="class-detail-card">
                <span>Teacher</span>
                <strong>{selectedClass.teacher.name}</strong>
                <small>{selectedClass.teacher.email}</small>
              </article>
              <article className="class-detail-card">
                <span>Schedule</span>
                <strong>{formatWeekdays(selectedClass.weekDays)}</strong>
                <small>{formatDuration(selectedClass.durationMinutes)}</small>
              </article>
            </div>
            <div className="data-grid class-detail-sections">
              <article className="data-panel">
                <h2>Roster</h2>
                <div className="student-event-list">
                  {selectedClass.enrollments.map((enrollment) => (
                    <article className="student-event-row" key={enrollment.id}>
                      <strong>{enrollment.student.fullName}</strong>
                    </article>
                  ))}
                  {selectedClass.enrollments.length === 0 ? (
                    <p className="muted-copy">No active students.</p>
                  ) : null}
                </div>
              </article>
              <article className="data-panel">
                <h2>Recent lessons</h2>
                <div className="student-event-list">
                  {selectedClass.lessons.map((lesson) => (
                    <article className="student-event-row" key={lesson.id}>
                      <span>{formatShortDate(lesson.lessonDate)}</span>
                      <strong>{lesson.name ?? "Untitled lesson"}</strong>
                    </article>
                  ))}
                  {selectedClass.lessons.length === 0 ? (
                    <p className="muted-copy">No submitted lessons.</p>
                  ) : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
