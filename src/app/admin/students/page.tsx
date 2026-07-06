import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatEntityResultMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminStudentsPageProps = {
  searchParams: Promise<{
    status?: string;
    studentSearch?: string;
  }>;
};

export default async function AdminStudentsPage({
  searchParams,
}: AdminStudentsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const studentSearch = params.studentSearch?.trim() || undefined;
  const successMessage = formatEntityResultMessage("Student", params.status);
  const students = await prisma.student.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    where: {
      ...(studentSearch
        ? { fullName: { contains: studentSearch, mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      isActive: true,
      _count: {
        select: { enrollments: true },
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
        <section className="intro" aria-labelledby="students-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="students-title">Students</h1>
          <p className="lede">
            Create students and deactivate learners who should no longer appear
            in new class records.
          </p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/students/new">
              Create student
            </Link>
          </div>
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <section className="panel" aria-label="Student filters">
          <form className="filter-form compact-filter-form">
            <label>
              <span>Student name</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="admin-students"
                name="studentSearch"
                placeholder="Type a student name"
                type="search"
              />
              <datalist id="admin-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Search
              </button>
              <Link className="text-link" href="/admin/students">
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="admin-student-results-title">
          <div className="section-heading-row">
            <div>
              <h2 id="admin-student-results-title">Student results</h2>
              <p className="muted-copy">
                {students.length} {students.length === 1 ? "student" : "students"} found.
              </p>
            </div>
          </div>
          <div className="student-result-grid">
            {students.map((student) => (
              <article className="student-result-card" key={student.id}>
                <span>
                  {student.isActive ? "Active student" : "Inactive student"}
                </span>
                <strong>{student.fullName}</strong>
                <small>
                  {student._count.enrollments} enrolled{" "}
                  {student._count.enrollments === 1 ? "class" : "classes"}
                </small>
                <div className="card-actions">
                  <Link
                    className="secondary-link compact-card-link"
                    href={`/admin/students/${student.id}/view`}
                  >
                    View
                  </Link>
                  <Link
                    className="text-link compact-card-link"
                    href={`/admin/students/${student.id}`}
                  >
                    Edit
                  </Link>
                </div>
              </article>
            ))}
            {students.length === 0 ? (
              <p className="muted-copy">No students match the current filters.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
