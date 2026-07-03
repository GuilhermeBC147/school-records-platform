import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/accounts";
import { getCurrentUser } from "@/lib/session";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    token?: string;
  }>;
};

const errorMessages = {
  expired: "This reset link is invalid or expired.",
  invalid: "Enter matching passwords with at least 8 characters.",
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage =
    params.error && params.error in errorMessages
      ? errorMessages[params.error as keyof typeof errorMessages]
      : null;

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="reset-title">
        <p className="eyebrow">Account access</p>
        <h1 id="reset-title">Choose a new password</h1>
        <p className="lede">
          Use at least 8 characters. Your old password will stop working after
          this form succeeds.
        </p>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <form action={resetPasswordAction} className="form-stack">
          <input name="token" type="hidden" value={params.token ?? ""} />

          <label>
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          <label>
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          <button className="primary-button" type="submit">
            Update password
          </button>
        </form>

        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
