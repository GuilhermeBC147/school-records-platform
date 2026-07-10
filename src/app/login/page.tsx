import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import {
  accountLocaleOptions,
  normalizeAccountLocale,
  type AccountLocale,
} from "@/lib/locale";
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
  const localeHref = (nextLocale: AccountLocale) => {
    const nextParams = new URLSearchParams({ locale: nextLocale });

    if (params.error) {
      nextParams.set("error", params.error);
    }

    if (params.reset) {
      nextParams.set("reset", params.reset);
    }

    return `/login?${nextParams.toString()}`;
  };

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <nav
          aria-label={t("account.language")}
          className="public-locale-toggle"
        >
          {accountLocaleOptions.map((option) => (
            <Link
              aria-current={locale === option.value ? "page" : undefined}
              aria-label={option.label}
              className="locale-toggle-link"
              href={localeHref(option.value)}
              key={option.value}
            >
              {option.value === "PT_BR" ? "PT-BR" : "EN"}
            </Link>
          ))}
        </nav>
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
