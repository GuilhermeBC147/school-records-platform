import Link from "next/link";
import { redirect } from "next/navigation";
import { createAccountAction } from "@/app/actions/accounts";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

type NewAccountPageProps = {
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
      return t("accountManagement.invalidCreateError");
    default:
      return null;
  }
}

export default async function NewAccountPage({
  searchParams,
}: NewAccountPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const t = getTranslations(currentUser.locale);
  const errorMessage = formatAccountErrorMessage(params.error, t);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="new-account-title">
          <Link className="text-link" href="/admin/manage-accounts">
            {t("accountManagement.backToAccounts")}
          </Link>
          <p className="eyebrow">{t("accountManagement.adminSetup")}</p>
          <h1 id="new-account-title">{t("accountManagement.createAccount")}</h1>
        </section>

        <section className="panel">
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={createAccountAction} className="admin-form">
            <label>
              <span>{t("label.name")}</span>
              <input name="name" required type="text" />
            </label>
            <label>
              <span>{t("account.email")}</span>
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              <span>{t("accountManagement.accountType")}</span>
              <select defaultValue="TEACHER" name="role" required>
                <option value="TEACHER">{t("accountManagement.teacher")}</option>
                <option value="RECEPTION">
                  {t("accountManagement.reception")}
                </option>
              </select>
            </label>
            <label>
              <span>{t("accountManagement.initialPassword")}</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="isActive" type="checkbox" />
              <span>{t("accountManagement.activeAccount")}</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/manage-accounts">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("accountManagement.createAccount")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
