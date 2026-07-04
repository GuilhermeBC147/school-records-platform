import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    reset?: string;
  }>;
};

const errorMessages = {
  invalid: "Email or password is incorrect.",
  missing: "Enter both email and password.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">Teacher access</p>
        <h1 id="login-title">Sign in to class records</h1>
        <p className="lede">
          Use your school account to view assigned classes and submit records.
        </p>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {params.reset === "success" ? (
          <p className="form-success">Password updated. Sign in again.</p>
        ) : null}

        <form action={loginAction} className="form-stack">
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

          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              placeholder="password123"
              required
              type="password"
            />
          </label>

          <button className="primary-button" type="submit">
            Sign in
          </button>
        </form>

        <Link className="text-link" href="/forgot-password">
          Forgot your password?
        </Link>

        <div className="demo-credentials">
          <strong>Development accounts</strong>
          <span>admin@example.com / password123</span>
          <span>reception@example.com / password123</span>
          <span>ana@example.com / password123</span>
          <span>bruno@example.com / password123</span>
        </div>
      </section>
    </main>
  );
}
