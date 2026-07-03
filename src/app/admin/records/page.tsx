import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminRecordsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const submittedLessons = await prisma.lesson.findMany({
    where: { status: "SUBMITTED" },
    orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
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
  });

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
