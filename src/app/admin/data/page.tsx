import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatShortDate } from "@/lib/date-format";

export const dynamic = "force-dynamic";

export default async function AdminDataPage() {
  const [teachers, classes, students, recentLessons] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: { classes: true },
        },
      },
    }),
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        book: true,
        semester: true,
        year: true,
        teacher: {
          select: { name: true },
        },
        _count: {
          select: {
            enrollments: true,
            lessons: true,
          },
        },
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: { enrollments: true },
        },
      },
    }),
    prisma.lesson.findMany({
      orderBy: { lessonDate: "desc" },
      take: 5,
      select: {
        id: true,
        lessonDate: true,
        status: true,
        class: {
          select: { name: true },
        },
        submittedBy: {
          select: { name: true },
        },
        _count: {
          select: {
            attendanceRecords: true,
            homeworkRecords: true,
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
            <span>Database preview</span>
          </div>
          <Link className="text-link" href="/">
            Home
          </Link>
        </div>
      </header>

      <div className="main data-page">
        <section className="intro" aria-labelledby="data-title">
          <p className="eyebrow">Sprint 2</p>
          <h1 id="data-title">Local school data from PostgreSQL</h1>
          <p className="lede">
            This page confirms the app can read the seeded teachers, classes,
            students, and lessons from the local database.
          </p>

          <div className="metric-grid" aria-label="Database record counts">
            <article className="metric">
              <span>{teachers.length}</span>
              <strong>Users</strong>
            </article>
            <article className="metric">
              <span>{classes.length}</span>
              <strong>Classes</strong>
            </article>
            <article className="metric">
              <span>{students.length}</span>
              <strong>Students</strong>
            </article>
            <article className="metric">
              <span>{recentLessons.length}</span>
              <strong>Recent Lessons</strong>
            </article>
          </div>
        </section>

        <section className="data-grid" aria-label="Database tables">
          <article className="panel data-panel">
            <h2>Teachers and Admins</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.name}</td>
                      <td>{teacher.email}</td>
                      <td>{teacher.role}</td>
                      <td>{teacher._count.classes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>Classes</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Book</th>
                    <th>Term</th>
                    <th>Teacher</th>
                    <th>Students</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((schoolClass) => (
                    <tr key={schoolClass.id}>
                      <td>{schoolClass.name}</td>
                      <td>{schoolClass.book ?? "-"}</td>
                      <td>
                        {schoolClass.semester && schoolClass.year
                          ? `Semester ${schoolClass.semester}/${schoolClass.year}`
                          : "-"}
                      </td>
                      <td>{schoolClass.teacher.name}</td>
                      <td>{schoolClass._count.enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>Students</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.fullName}</td>
                      <td>{student._count.enrollments}</td>
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
                    <th>Class</th>
                    <th>Status</th>
                    <th>Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{formatShortDate(lesson.lessonDate)}</td>
                      <td>{lesson.class.name}</td>
                      <td>{lesson.status}</td>
                      <td>{lesson.submittedBy?.name ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
