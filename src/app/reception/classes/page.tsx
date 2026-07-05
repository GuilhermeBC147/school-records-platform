import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Weekday } from "@/generated/prisma/enums";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ReceptionClassesPageProps = {
  searchParams: Promise<{
    classId?: string;
    classSearch?: string;
    teacherId?: string;
    weekDay?: string;
  }>;
};

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
  const selectedWeekDay = weekdayOptions.some(
    (weekday) => weekday.value === query.weekDay,
  )
    ? (query.weekDay as Weekday)
    : undefined;

  const [classes, teachers] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      where: {
        isActive: true,
        ...(classSearch
          ? { name: { contains: classSearch, mode: "insensitive" } }
          : {}),
        ...(selectedTeacherId ? { teacherId: selectedTeacherId } : {}),
        ...(selectedWeekDay ? { weekDays: { has: selectedWeekDay } } : {}),
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
          <form className="filter-form class-filter-form">
            <label>
              <span>Class search</span>
              <input
                defaultValue={classSearch ?? ""}
                name="classSearch"
                placeholder="Type a class name"
                type="search"
              />
            </label>
            <label>
              <span>Class</span>
              <select defaultValue={query.classId ?? ""} name="classId">
                <option value="">Choose a class</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
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
            <label>
              <span>Weekday</span>
              <select defaultValue={selectedWeekDay ?? ""} name="weekDay">
                <option value="">Any day</option>
                {weekdayOptions.map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>
                    {weekday.label}
                  </option>
                ))}
              </select>
            </label>
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
            <dl className="detail-list">
              <div>
                <dt>Teacher</dt>
                <dd>
                  {selectedClass.teacher.name} ({selectedClass.teacher.email})
                </dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>
                  {formatWeekdays(selectedClass.weekDays)} |{" "}
                  {formatDuration(selectedClass.durationMinutes)}
                </dd>
              </div>
              <div>
                <dt>Roster</dt>
                <dd>
                  {selectedClass.enrollments.length > 0
                    ? selectedClass.enrollments
                        .map((enrollment) => enrollment.student.fullName)
                        .join(", ")
                    : "No active students."}
                </dd>
              </div>
              <div>
                <dt>Recent lessons</dt>
                <dd>
                  {selectedClass.lessons.length > 0
                    ? selectedClass.lessons
                        .map(
                          (lesson) =>
                            `${formatShortDate(lesson.lessonDate)} | ${
                              lesson.name ?? "Untitled lesson"
                            }`,
                        )
                        .join("; ")
                    : "No submitted lessons."}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
    </main>
  );
}
