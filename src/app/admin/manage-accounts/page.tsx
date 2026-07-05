import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ManageAccountsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function formatAccountRole(role: string) {
  return role === "RECEPTION" ? "Reception" : "Teacher";
}

export default async function ManageAccountsPage({
  searchParams,
}: ManageAccountsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const accounts = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "RECEPTION"] } },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
        <section className="intro" aria-labelledby="accounts-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="accounts-title">Manage accounts</h1>
          <p className="lede">
            Create staff logins and deactivate accounts that should no longer
            access school records.
          </p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/manage-accounts/new">
              Create account
            </Link>
          </div>
        </section>

        {params.status ? (
          <p className="form-success">
            Account {params.status === "created" ? "created" : "updated"}.
          </p>
        ) : null}

        <section className="panel data-panel" aria-label="Staff accounts">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Classes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>{formatAccountRole(account.role)}</td>
                    <td>{account.isActive ? "Active" : "Inactive"}</td>
                    <td>{account.role === "TEACHER" ? account._count.classes : "-"}</td>
                    <td>
                      <Link
                        className="text-link compact-link"
                        href={`/admin/manage-accounts/${account.id}`}
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
