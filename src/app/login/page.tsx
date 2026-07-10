import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { accountLocaleOptions, normalizeAccountLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    locale?: string;
    reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const locale = normalizeAccountLocale(params.locale);
  const t = getTranslations(locale);
  const errorMessages = {
    invalid: t("auth.loginInvalid"),
    missing: t("auth.loginMissing"),
  };
  const errorMessage =
    params.error && params.error in errorMessages
      ? errorMessages[params.error as keyof typeof errorMessages]
      : null;

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <form action="/login" className="topbar-locale-form" method="get">
          {params.error ? <input name="error" type="hidden" value={params.error} /> : null}
          {params.reset ? <input name="reset" type="hidden" value={params.reset} /> : null}
          <label>
            <span>{t("account.language")}</span>
            <select defaultValue={locale} name="locale">
              {accountLocaleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="submit">
            {t("account.saveLanguage")}
          </button>
        </form>
      </header>

      <section className="auth-panel" aria-labelledby="login-title">
        <Link className="text-link auth-back-link" href="/">
          {t("auth.backToLanding")}
        </Link>
        <p className="eyebrow">{t("auth.Access")}</p>
        <h1 id="login-title">{t("auth.signInTitle")}</h1>
        <p className="lede">{t("auth.loginCopy")}</p>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {params.reset === "success" ? (
          <p className="form-success">{t("auth.passwordUpdatedSignIn")}</p>
        ) : null}

        <form action={loginAction} className="form-stack">
          <input name="locale" type="hidden" value={locale} />
          <label>
            <span>{t("auth.email")}</span>
            <input
              autoComplete="email"
              name="email"
              placeholder={t("auth.emailPlaceholder")}
              required
              type="email"
            />
          </label>

          <label>
            <span>{t("auth.password")}</span>
            <input
              autoComplete="current-password"
              name="password"
              placeholder={t("auth.passwordPlaceholder")}
              required
              type="password"
            />
          </label>

          <button className="primary-button" type="submit">
            {t("auth.signIn")}
          </button>
        </form>

        <Link className="text-link" href="/forgot-password">
          {t("auth.forgotPassword")}
        </Link>

        <div className="demo-credentials">
          <strong>{t("auth.devAccounts")}</strong>
          <span>admin@example.com / password123</span>
          <span>reception1@example.com / password123</span>
          <span>teacher1@example.com / password123</span>
          <span>teacher2@example.com / password123</span>
        </div>
      </section>
    </main>
  );
}
