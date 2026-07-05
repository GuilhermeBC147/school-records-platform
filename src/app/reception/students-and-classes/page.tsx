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

type ReceptionLookupPageProps = {
  searchParams: Promise<{
    classId?: string;
    classSearch?: string;
    studentId?: string;
    studentSearch?: string;
    teacherId?: string;
    weekDay?: string;
  }>;
};

type StudentInsight = {
  absentLessons: {
    lesson: {
      class: { name: string };
      lessonDate: Date;
      name: string | null;
    };
  }[];
  homeworkNotDone: {
    lesson: {
      class: { name: string };
      lessonDate: Date;
      name: string | null;
    };
  }[];
  lastAttendedLesson: {
    lesson: {
      class: { name: string };
      lessonDate: Date;
      name: string | null;
    };
  } | null;
};

function lessonLabel(lesson: {
  class: { name: string };
  lessonDate: Date;
  name: string | null;
}) {
  return `${formatShortDate(lesson.lessonDate)} | ${lesson.class.name} | ${
    lesson.name ?? "Untitled lesson"
  }`;
}

async function getStudentInsight(studentId: string): Promise<StudentInsight> {
  const [lastAttendedLesson, absentLessons, homeworkNotDone] = await Promise.all([
    prisma.attendanceRecord.findFirst({
      where: {
        status: { not: "ABSENT" },
        studentId,
        lesson: { status: "SUBMITTED" },
      },
      orderBy: { lesson: { lessonDate: "desc" } },
      select: {
        lesson: {
          select: {
            lessonDate: true,
            name: true,
            class: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        status: "ABSENT",
        studentId,
        lesson: { status: "SUBMITTED" },
      },
      orderBy: { lesson: { lessonDate: "desc" } },
      take: 12,
      select: {
        lesson: {
          select: {
            lessonDate: true,
            name: true,
            class: { select: { name: true } },
          },
        },
      },
    }),
    prisma.homeworkRecord.findMany({
      where: {
        status: "INCOMPLETE",
        studentId,
        lesson: { status: "SUBMITTED" },
      },
      orderBy: { lesson: { lessonDate: "desc" } },
      take: 12,
      select: {
        lesson: {
          select: {
            lessonDate: true,
            name: true,
            class: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return { absentLessons, homeworkNotDone, lastAttendedLesson };
}

export default async function ReceptionLookupPage({
  searchParams,
}: ReceptionLookupPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const classSearch = query.classSearch?.trim() || undefined;
  const studentSearch = query.studentSearch?.trim() || undefined;
  const selectedTeacherId = query.teacherId?.trim() || undefined;
  const selectedWeekDay = weekdayOptions.some(
    (weekday) => weekday.value === query.weekDay,
  )
    ? (query.weekDay as Weekday)
    : undefined;

  const [students, classes, teachers] = await Promise.all([
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      where: {
        isActive: true,
        ...(studentSearch
          ? { fullName: { contains: studentSearch, mode: "insensitive" } }
          : {}),
      },
      take: 60,
      select: { id: true, fullName: true },
    }),
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

  const selectedStudent = query.studentId
    ? await prisma.student.findFirst({
        where: { id: query.studentId, isActive: true },
        select: {
          id: true,
          fullName: true,
          enrollments: {
            where: { status: "ACTIVE", class: { isActive: true } },
            orderBy: { class: { name: "asc" } },
            select: {
              id: true,
              class: {
                select: {
                  durationMinutes: true,
                  name: true,
                  teacher: { select: { name: true } },
                  weekDays: true,
                },
              },
            },
          },
        },
      })
    : null;
  const selectedClass = query.classId
    ? classes.find((schoolClass) => schoolClass.id === query.classId)
    : null;
  const insight = selectedStudent
    ? await getStudentInsight(selectedStudent.id)
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
        <section className="intro" aria-labelledby="lookup-title">
          <Link className="text-link" href="/reception">
            Back to reception
          </Link>
          <p className="eyebrow">Reception</p>
          <h1 id="lookup-title">Students and classes</h1>
          <p className="lede">
            Search student attendance and homework history, or filter active
            classes by teacher and weekday.
          </p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          ) : null}
        </section>

        <section className="panel" aria-label="Lookup filters">
          <form className="filter-form class-filter-form">
            <label>
              <span>Student search</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="reception-students"
                name="studentSearch"
                placeholder="Type a student name"
                type="search"
              />
              <datalist id="reception-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <label>
              <span>Student</span>
              <select defaultValue={query.studentId ?? ""} name="studentId">
                <option value="">Choose a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
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
              <Link className="text-link" href="/reception/students-and-classes">
                Clear
              </Link>
            </div>
          </form>
        </section>

        {selectedStudent && insight ? (
          <section className="panel data-panel" aria-labelledby="student-summary-title">
            <h2 id="student-summary-title">{selectedStudent.fullName}</h2>
            <div className="metric-grid compact-metrics">
              <article className="metric">
                <span>{insight.lastAttendedLesson ? "1" : "0"}</span>
                <strong>Last attended found</strong>
              </article>
              <article className="metric">
                <span>{insight.absentLessons.length}</span>
                <strong>Missed classes</strong>
              </article>
              <article className="metric">
                <span>{insight.homeworkNotDone.length}</span>
                <strong>Homework not done</strong>
              </article>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Last attended lesson</dt>
                <dd>
                  {insight.lastAttendedLesson
                    ? lessonLabel(insight.lastAttendedLesson.lesson)
                    : "No attended submitted lessons found."}
                </dd>
              </div>
              <div>
                <dt>Active classes</dt>
                <dd>
                  {selectedStudent.enrollments.length > 0
                    ? selectedStudent.enrollments
                        .map(
                          (enrollment) =>
                            `${enrollment.class.name} with ${
                              enrollment.class.teacher.name
                            } (${formatWeekdays(enrollment.class.weekDays)} | ${formatDuration(
                              enrollment.class.durationMinutes,
                            )})`,
                        )
                        .join("; ")
                    : "No active class enrollment."}
                </dd>
              </div>
            </dl>
            <div className="data-grid">
              <article className="data-panel">
                <h2>Absent lessons</h2>
                <div className="table-wrap">
                  <table>
                    <tbody>
                      {insight.absentLessons.map((record) => (
                        <tr key={lessonLabel(record.lesson)}>
                          <td>{lessonLabel(record.lesson)}</td>
                        </tr>
                      ))}
                      {insight.absentLessons.length === 0 ? (
                        <tr>
                          <td>No absences in submitted records.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
              <article className="data-panel">
                <h2>Homework not done</h2>
                <div className="table-wrap">
                  <table>
                    <tbody>
                      {insight.homeworkNotDone.map((record) => (
                        <tr key={lessonLabel(record.lesson)}>
                          <td>{lessonLabel(record.lesson)}</td>
                        </tr>
                      ))}
                      {insight.homeworkNotDone.length === 0 ? (
                        <tr>
                          <td>No incomplete homework in submitted records.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {selectedClass ? (
          <section className="panel data-panel" aria-labelledby="class-summary-title">
            <h2 id="class-summary-title">{selectedClass.name}</h2>
            <p className="muted-copy">
              {selectedClass.book ?? "Class"}
              {selectedClass.semester && selectedClass.year
                ? ` | Semester ${selectedClass.semester}/${selectedClass.year}`
                : ""}
            </p>
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
