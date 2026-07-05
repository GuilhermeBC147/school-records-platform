import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
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

        {params.status ? (
          <p className="form-success">
            Student {params.status === "created" ? "created" : "updated"}.
          </p>
        ) : null}

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

        <section className="panel data-panel" aria-label="Students">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Classes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.fullName}</td>
                    <td>{student.isActive ? "Active" : "Inactive"}</td>
                    <td>{student._count.enrollments}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="text-link compact-link"
                          href={`/admin/students/${student.id}/view`}
                        >
                          View
                        </Link>
                        <Link
                          className="text-link compact-link"
                          href={`/admin/students/${student.id}`}
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No students match the current filters.</td>
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
