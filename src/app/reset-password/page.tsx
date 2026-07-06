import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/accounts";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const t = getTranslations(defaultUnauthenticatedLocale);
  const errorMessages = {
    expired: t("auth.resetExpired"),
    invalid: t("auth.resetInvalid"),
  };
  const errorMessage =
    params.error && params.error in errorMessages
      ? errorMessages[params.error as keyof typeof errorMessages]
      : null;

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="reset-title">
        <p className="eyebrow">{t("auth.accountAccess")}</p>
        <h1 id="reset-title">{t("auth.resetTitle")}</h1>
        <p className="lede">{t("auth.resetUseCopy")}</p>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <form action={resetPasswordAction} className="form-stack">
          <input name="token" type="hidden" value={params.token ?? ""} />

          <label>
            <span>{t("auth.newPassword")}</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
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

          <button className="primary-button" type="submit">
            {t("auth.resetSubmit")}
          </button>
        </form>

        <Link className="text-link" href="/login">
          {t("auth.backToSignIn")}
        </Link>
      </section>
    </main>
  );
}
