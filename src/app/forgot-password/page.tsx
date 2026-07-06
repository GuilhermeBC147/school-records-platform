import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordResetAction } from "@/app/actions/accounts";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    status?: string;
    token?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const t = getTranslations(defaultUnauthenticatedLocale);
  const resetHref = params.token
    ? `/reset-password?token=${encodeURIComponent(params.token)}`
    : null;

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="forgot-title">
        <p className="eyebrow">{t("auth.accountAccess")}</p>
        <h1 id="forgot-title">{t("auth.resetPasswordTitle")}</h1>
        <p className="lede">{t("auth.forgotResetCopy")}</p>

        {params.status === "sent" ? (
          <p className="form-success">{t("auth.resetLinkReady")}</p>
        ) : null}

        {resetHref ? (
          <div className="dev-reset-link">
            <strong>{t("auth.devResetLink")}</strong>
            <Link className="text-link" href={resetHref}>
              {t("auth.openResetPage")}
            </Link>
          </div>
        ) : null}

        <form action={requestPasswordResetAction} className="form-stack">
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

          <button className="primary-button" type="submit">
            {t("auth.requestResetLink")}
          </button>
        </form>

        <Link className="text-link" href="/login">
          {t("auth.backToSignIn")}
        </Link>
      </section>
    </main>
  );
}
