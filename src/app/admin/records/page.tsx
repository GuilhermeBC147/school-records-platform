import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminRecordsPageProps = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    studentId?: string;
    teacherId?: string;
  }>;
};

function readFilterValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function readFilterDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month - 1, day + 1));

  return { end, start };
}

function buildExportHref(filters: {
  classId?: string;
  date?: string;
  studentId?: string;
  teacherId?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/admin/records/export?${query}` : "/admin/records/export";
}

export default async function AdminRecordsPage({
  searchParams,
}: AdminRecordsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const filters = await searchParams;
  const classId = readFilterValue(filters.classId);
  const dateRange = readFilterDate(filters.date);
  const studentId = readFilterValue(filters.studentId);
  const teacherId = readFilterValue(filters.teacherId);

  const [classes, students, teachers, submittedLessons] = await Promise.all([
    prisma.class.findMany({
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
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.lesson.findMany({
      where: {
        status: "SUBMITTED",
        ...(classId ? { classId } : {}),
        ...(dateRange
          ? {
              lessonDate: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            }
          : {}),
        ...(teacherId ? { class: { teacherId } } : {}),
        ...(studentId
          ? {
              attendanceRecords: {
                some: { studentId },
              },
            }
          : {}),
      },
    orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      lessonDate: true,
      notes: true,
      submittedAt: true,
      class: {
        select: {
          name: true,
          level: true,
          teacher: {
            select: {
              name: true,
            },
          },
        },
      },
      submittedBy: {
        select: {
          name: true,
        },
      },
      attendanceRecords: {
        orderBy: {
          student: { fullName: "asc" },
        },
        select: {
          id: true,
          status: true,
          student: {
            select: {
              id: true,
              fullName: true,
              preferredName: true,
            },
          },
        },
      },
      homeworkRecords: {
        select: {
          status: true,
          studentId: true,
        },
      },
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
        <section className="intro" aria-labelledby="records-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin review</p>
          <h1 id="records-title">Submitted class records</h1>
          <p className="lede">
            Review the attendance and homework records teachers have submitted.
          </p>
          <div className="action-row">
            <Link className="primary-link" href={buildExportHref(filters)}>
              Export CSV
            </Link>
          </div>
        </section>

        <section className="panel" aria-label="Record filters">
          <form className="filter-form">
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
              <span>Class</span>
              <select defaultValue={classId ?? ""} name="classId">
                <option value="">All classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Student</span>
              <select defaultValue={studentId ?? ""} name="studentId">
                <option value="">All students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input defaultValue={filters.date ?? ""} name="date" type="date" />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply filters
              </button>
              <Link className="text-link" href="/admin/records">
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="records-review" aria-label="Submitted records">
          {submittedLessons.map((lesson) => {
            const homeworkByStudentId = new Map(
              lesson.homeworkRecords.map((record) => [
                record.studentId,
                record.status,
              ]),
            );

            return (
              <article className="panel data-panel record-review" key={lesson.id}>
                <div className="record-review-header">
                  <div>
                    <p className="eyebrow">
                      {lesson.class.level ?? "No level"}
                    </p>
                    <h2>{lesson.class.name}</h2>
                    <p>Lesson name: {lesson.name ?? "Untitled lesson"}</p>
                    <p>
                      Lesson: {formatShortDateTime(lesson.lessonDate)}
                      {" | "}
                      Teacher: {lesson.class.teacher.name}
                    </p>
                    <p>
                      Submitted by {lesson.submittedBy?.name ?? "Unknown"}
                      {lesson.submittedAt
                        ? ` on ${formatShortDateTime(lesson.submittedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="metric compact-metric">
                    <span>{lesson.attendanceRecords.length}</span>
                    <strong>Students</strong>
                  </div>
                </div>

                {lesson.notes ? <p className="record-notes">{lesson.notes}</p> : null}

                <div className="record-actions">
                  <Link className="primary-link" href={`/admin/records/${lesson.id}`}>
                    View details
                  </Link>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Preferred</th>
                        <th>Attendance</th>
                        <th>Homework</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.attendanceRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{record.student.fullName}</td>
                          <td>{record.student.preferredName ?? "-"}</td>
                          <td>{record.status}</td>
                          <td>
                            {homeworkByStudentId.get(record.student.id) ??
                              "NOT_ASSIGNED"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}

          {submittedLessons.length === 0 ? (
            <article className="panel data-panel">
              <h2>No submitted records yet</h2>
              <p className="muted-copy">
                Submitted class records will appear here for admin review.
              </p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
