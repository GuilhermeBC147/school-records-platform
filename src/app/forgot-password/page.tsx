import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordResetAction } from "@/app/actions/accounts";
import { getCurrentUser } from "@/lib/session";

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
  const resetHref = params.token
    ? `/reset-password?token=${encodeURIComponent(params.token)}`
    : null;

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="forgot-title">
        <p className="eyebrow">Account access</p>
        <h1 id="forgot-title">Reset your password</h1>
        <p className="lede">
          Enter your school email. If the account exists, a reset link will be
          prepared.
        </p>

        {params.status === "sent" ? (
          <p className="form-success">
            If that email has an active account, a reset link is ready.
          </p>
        ) : null}

        {resetHref ? (
          <div className="dev-reset-link">
            <strong>Development reset link</strong>
            <Link className="text-link" href={resetHref}>
              Open reset page
            </Link>
          </div>
        ) : null}

        <form action={requestPasswordResetAction} className="form-stack">
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              placeholder="ana@example.com"
              required
              type="email"
            />
          </label>

          <button className="primary-button" type="submit">
            Request reset link
          </button>
        </form>

        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
