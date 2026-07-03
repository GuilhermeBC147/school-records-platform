import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ClassDetailPageProps = {
  params: Promise<{
    classId: string;
  }>;
};

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { classId } = await params;

  const schoolClass = await prisma.class.findFirst({
    where: {
      id: classId,
      isActive: true,
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    select: {
      id: true,
      name: true,
      level: true,
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
      enrollments: {
        orderBy: {
          student: {
            fullName: "asc",
          },
        },
        select: {
          id: true,
          status: true,
          student: {
            select: {
              fullName: true,
              preferredName: true,
            },
          },
        },
      },
      lessons: {
        orderBy: {
          lessonDate: "desc",
        },
        take: 8,
        select: {
          id: true,
          lessonDate: true,
          status: true,
          _count: {
            select: {
              attendanceRecords: true,
              homeworkRecords: true,
            },
          },
        },
      },
    },
  });

  if (!schoolClass) {
    notFound();
  }

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
        <section className="intro class-detail-hero" aria-labelledby="class-title">
          <div>
            <Link className="text-link" href="/dashboard">
              Back to dashboard
            </Link>
            <p className="eyebrow">{schoolClass.level ?? "No level"}</p>
            <h1 id="class-title">{schoolClass.name}</h1>
            <p className="lede">
              Teacher: {schoolClass.teacher.name} ({schoolClass.teacher.email})
            </p>
            <div className="action-row">
              <Link className="primary-link" href={`/dashboard/classes/${schoolClass.id}/record`}>
                New class record
              </Link>
            </div>
          </div>

          <div className="metric-grid compact-metrics" aria-label="Class totals">
            <article className="metric">
              <span>{schoolClass.enrollments.length}</span>
              <strong>Students</strong>
            </article>
            <article className="metric">
              <span>{schoolClass.lessons.length}</span>
              <strong>Recent Lessons</strong>
            </article>
          </div>
        </section>

        <section className="data-grid" aria-label="Class data">
          <article className="panel data-panel">
            <h2>Enrolled Students</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Preferred</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.student.fullName}</td>
                      <td>{enrollment.student.preferredName ?? "-"}</td>
                      <td>{enrollment.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>Recent Lessons</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Homework</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{formatShortDateTime(lesson.lessonDate)}</td>
                      <td>{lesson.status}</td>
                      <td>{lesson._count.attendanceRecords}</td>
                      <td>{lesson._count.homeworkRecords}</td>
                      <td>
                        <Link
                          className="text-link compact-link"
                          href={`/dashboard/classes/${schoolClass.id}/record?lessonId=${lesson.id}`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {schoolClass.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No lessons recorded yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
