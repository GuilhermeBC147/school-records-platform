import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminStudentsPageProps = {
  searchParams: Promise<{
    status?: string;
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
  const students = await prisma.student.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      preferredName: true,
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

        <section className="panel data-panel" aria-label="Students">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Preferred</th>
                  <th>Status</th>
                  <th>Classes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.fullName}</td>
                    <td>{student.preferredName ?? "-"}</td>
                    <td>{student.isActive ? "Active" : "Inactive"}</td>
                    <td>{student._count.enrollments}</td>
                    <td>
                      <Link
                        className="text-link compact-link"
                        href={`/admin/students/${student.id}`}
                      >
                        Edit
                      </Link>
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
