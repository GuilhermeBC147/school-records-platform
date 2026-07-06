import Link from "next/link";
import { redirect } from "next/navigation";
import {
  changeOwnPasswordAction,
  updateOwnDateFormatAction,
} from "@/app/actions/accounts";
import { accountDateFormatOptions } from "@/lib/date-format";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

type AccountPageProps = {
  searchParams: Promise<{
    dateFormat?: string;
    locale?: string;
    password?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const params = await searchParams;
  const t = getTranslations(currentUser.locale);
  const passwordMessages = {
    current: t("account.passwordCurrentError"),
    invalid: t("account.passwordInvalidError"),
    updated: t("account.passwordUpdated"),
  } as const;
  const passwordMessage =
    params.password && params.password in passwordMessages
      ? passwordMessages[params.password as keyof typeof passwordMessages]
      : null;
  const isSuccess = params.password === "updated";
  const dateFormatUpdated = params.dateFormat === "updated";
  const localeUpdated = params.locale === "updated";

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="account-title">
          <Link className="text-link" href="/dashboard">
            {t("account.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("dashboard.account")}</p>
          <h1 id="account-title">{t("account.yourAccount")}</h1>
          <p className="lede">{currentUser.email}</p>
          {localeUpdated ? (
            <p className="form-success">{t("account.languageUpdated")}</p>
          ) : null}
        </section>

        <section className="panel">
          <h2>{t("account.dateFormat")}</h2>
          {dateFormatUpdated ? (
            <p className="form-success">{t("account.dateFormatUpdated")}</p>
          ) : null}
          <form action={updateOwnDateFormatAction} className="admin-form">
            <label>
              <span>{t("account.preferredDateFormat")}</span>
              <select defaultValue={currentUser.dateFormat} name="dateFormat">
                {accountDateFormatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.example})
                  </option>
                ))}
              </select>
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("account.saveDateFormat")}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>{t("account.changePassword")}</h2>
          {passwordMessage ? (
            <p className={isSuccess ? "form-success" : "form-error"}>
              {passwordMessage}
            </p>
          ) : null}
          <form action={changeOwnPasswordAction} className="admin-form">
            <label>
              <span>{t("account.currentPassword")}</span>
              <input
                autoComplete="current-password"
                name="currentPassword"
                required
                type="password"
              />
            </label>
            <label>
              <span>{t("auth.newPassword")}</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="newPassword"
                required
                type="password"
              />
            </label>
            <label>
              <span>{t("auth.confirmPassword")}</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirmPassword"
                required
                type="password"
              />
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("account.updatePassword")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
