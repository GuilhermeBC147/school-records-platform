import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminTeachersPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function AdminTeachersPage({
  searchParams,
}: AdminTeachersPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      _count: {
        select: { classes: true },
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
        <section className="intro" aria-labelledby="teachers-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="teachers-title">Teacher accounts</h1>
          <p className="lede">
            Create teacher logins and deactivate accounts that should no longer
            access class records.
          </p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/teachers/new">
              Create teacher
            </Link>
          </div>
        </section>

        {params.status ? (
          <p className="form-success">
            Teacher account {params.status === "created" ? "created" : "updated"}.
          </p>
        ) : null}

        <section className="panel data-panel" aria-label="Teacher accounts">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Classes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>{teacher.name}</td>
                    <td>{teacher.email}</td>
                    <td>{teacher.isActive ? "Active" : "Inactive"}</td>
                    <td>{teacher._count.classes}</td>
                    <td>
                      <Link
                        className="text-link compact-link"
                        href={`/admin/teachers/${teacher.id}`}
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
