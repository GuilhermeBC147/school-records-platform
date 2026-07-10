import Link from "next/link";
import { redirect } from "next/navigation";
import {
  changeOwnPasswordAction,
  updateOwnDateFormatAction,
  updateOwnLocaleAction,
  updateOwnThemeAction,
} from "@/app/actions/accounts";
import { accountDateFormatOptions } from "@/lib/date-format";
import { accountLocaleOptions } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { accountThemeOptions } from "@/lib/theme";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

type AccountPageProps = {
  searchParams: Promise<{
    dateFormat?: string;
    locale?: string;
    password?: string;
    theme?: string;
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
  const themeUpdated = params.theme === "updated";
  const dashboardHref = currentUser.role === "RECEPTION" ? "/reception" : "/dashboard";

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="account-title">
          <Link className="text-link" href={dashboardHref}>
            {t("account.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("dashboard.account")}</p>
          <h1 id="account-title">{t("account.yourAccount")}</h1>
          <p className="lede">{currentUser.email}</p>
        </section>

        <section className="panel">
          <h2>{t("account.language")}</h2>
          {localeUpdated ? (
            <p className="form-success">{t("account.languageUpdated")}</p>
          ) : null}
          <form action={updateOwnLocaleAction} className="admin-form">
            <input
              name="redirectTo"
              type="hidden"
              value="/dashboard/account"
            />
            <label>
              <span>{t("account.preferredLanguage")}</span>
              <select defaultValue={currentUser.locale} name="locale">
                {accountLocaleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("account.saveLanguage")}
              </button>
            </div>
          </form>
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
          <h2>{t("account.appearance")}</h2>
          {themeUpdated ? (
            <p className="form-success">{t("account.themeUpdated")}</p>
          ) : null}
          <form action={updateOwnThemeAction} className="admin-form">
            <fieldset className="segmented-field">
              <legend>{t("account.preferredTheme")}</legend>
              <div className="segmented-control">
                {accountThemeOptions.map((option) => (
                  <label className="segmented-option" key={option.value}>
                    <input
                      defaultChecked={currentUser.theme === option.value}
                      name="theme"
                      type="radio"
                      value={option.value}
                    />
                    <span>{t(option.labelKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("account.saveTheme")}
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
