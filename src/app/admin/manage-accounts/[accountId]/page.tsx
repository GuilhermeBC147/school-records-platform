import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateAccountAction } from "@/app/actions/accounts";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

type EditAccountPageProps = {
  params: Promise<{
    accountId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function formatAccountErrorMessage(
  error: string | undefined,
  t: ReturnType<typeof getTranslations>,
) {
  switch (error) {
    case "duplicate":
      return t("accountManagement.duplicateError");
    case "invalid":
      return t("accountManagement.invalidUpdateError");
    case "self":
      return t("accountManagement.selfDeactivateError");
    default:
      return null;
  }
}

export default async function EditAccountPage({
  params,
  searchParams,
}: EditAccountPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { accountId } = await params;
  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const account = await prisma.user.findFirst({
    where: {
      id: accountId,
      role: { in: ["TEACHER", "RECEPTION"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!account) {
    notFound();
  }

  const errorMessage = formatAccountErrorMessage(query.error, t);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="edit-account-title">
          <Link className="text-link" href="/admin/manage-accounts">
            {t("accountManagement.backToAccounts")}
          </Link>
          <p className="eyebrow">{t("accountManagement.adminSetup")}</p>
          <h1 id="edit-account-title">{t("accountManagement.editAccount")}</h1>
        </section>

        <section className="panel">
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={updateAccountAction} className="admin-form">
            <input name="accountId" type="hidden" value={account.id} />
            <label>
              <span>{t("label.name")}</span>
              <input defaultValue={account.name} name="name" required type="text" />
            </label>
            <label>
              <span>{t("account.email")}</span>
              <input
                autoComplete="email"
                defaultValue={account.email}
                name="email"
                required
                type="email"
              />
            </label>
            <label>
              <span>{t("accountManagement.accountType")}</span>
              <select defaultValue={account.role} name="role" required>
                <option value="TEACHER">{t("accountManagement.teacher")}</option>
                <option value="RECEPTION">
                  {t("accountManagement.reception")}
                </option>
              </select>
            </label>
            <label>
              <span>{t("accountManagement.newPassword")}</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="password"
                placeholder={t("accountManagement.leavePasswordBlank")}
                type="password"
              />
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={account.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>{t("accountManagement.activeAccount")}</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/manage-accounts">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("accountManagement.saveAccount")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
