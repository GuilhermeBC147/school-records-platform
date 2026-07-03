import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminRecordDetailPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function AdminRecordDetailPage({
  params,
}: AdminRecordDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: "SUBMITTED",
    },
    select: {
      id: true,
      name: true,
      lessonDate: true,
      notes: true,
      submittedAt: true,
      class: {
        select: {
          name: true,
          teacher: {
            select: {
              email: true,
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

  if (!lesson) {
    notFound();
  }

  const homeworkByStudentId = new Map(
    lesson.homeworkRecords.map((record) => [record.studentId, record.status]),
  );

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
        <section className="intro" aria-labelledby="record-detail-title">
          <Link className="text-link" href="/admin/records">
            Back to records
          </Link>
          <p className="eyebrow">Submitted record</p>
          <h1 id="record-detail-title">
            {lesson.name ?? "Untitled lesson"}
          </h1>
          <p className="lede">
            {lesson.class.name} with {lesson.class.teacher.name}
          </p>
        </section>

        <section className="data-grid" aria-label="Record summary">
          <article className="panel data-panel">
            <h2>Lesson details</h2>
            <dl className="detail-list">
              <div>
                <dt>Date</dt>
                <dd>{formatShortDateTime(lesson.lessonDate)}</dd>
              </div>
              <div>
                <dt>Teacher</dt>
                <dd>
                  {lesson.class.teacher.name} ({lesson.class.teacher.email})
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>
                  {lesson.submittedBy?.name ?? "Unknown"}
                  {lesson.submittedAt
                    ? ` on ${formatShortDateTime(lesson.submittedAt)}`
                    : ""}
                </dd>
              </div>
            </dl>
          </article>

          <article className="panel data-panel">
            <h2>Notes</h2>
            <p className="muted-copy">{lesson.notes ?? "No notes recorded."}</p>
          </article>
        </section>

        <section className="panel data-panel" aria-labelledby="student-records">
          <h2 id="student-records">Student records</h2>
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
        </section>
      </div>
    </main>
  );
}
