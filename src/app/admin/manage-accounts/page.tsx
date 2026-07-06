import Link from "next/link";
import { redirect } from "next/navigation";
import { formatEntityResultMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type ManageAccountsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function formatAccountRole(
  role: string,
  t: ReturnType<typeof getTranslations>,
) {
  return role === "RECEPTION"
    ? t("accountManagement.reception")
    : t("accountManagement.teacher");
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
  const t = getTranslations(currentUser.locale);
  const successMessage = formatEntityResultMessage(
    "Account",
    params.status,
    currentUser.locale,
  );
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
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="accounts-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("accountManagement.adminSetup")}</p>
          <h1 id="accounts-title">{t("accountManagement.manageAccounts")}</h1>
          <p className="lede">{t("accountManagement.createCopy")}</p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/manage-accounts/new">
              {t("accountManagement.createAccount")}
            </Link>
          </div>
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <section
          className="panel data-panel"
          aria-label={t("accountManagement.staffAccounts")}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("label.name")}</th>
                  <th>{t("account.email")}</th>
                  <th>{t("label.type")}</th>
                  <th>{t("label.status")}</th>
                  <th>{t("dashboard.classes")}</th>
                  <th>{t("label.action")}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>{formatAccountRole(account.role, t)}</td>
                    <td>
                      {account.isActive ? t("label.active") : t("label.inactive")}
                    </td>
                    <td>{account.role === "TEACHER" ? account._count.classes : "-"}</td>
                    <td>
                      <Link
                        className="text-link compact-link"
                        href={`/admin/manage-accounts/${account.id}`}
                      >
                        {t("label.edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{t("empty.noStaffAccounts")}</td>
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
