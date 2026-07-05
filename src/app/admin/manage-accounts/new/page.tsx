import Link from "next/link";
import { redirect } from "next/navigation";
import { createAccountAction } from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";

type NewAccountPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages = {
  duplicate: "A user with that email already exists.",
  invalid: "Enter a name, email, account type, and password with at least 8 characters.",
};

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
  const errorMessage =
    params.error && params.error in errorMessages
      ? errorMessages[params.error as keyof typeof errorMessages]
      : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Class Records Platform</strong>
            <span>{currentUser.name}</span>
          </div>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="main data-page">
        <section className="intro" aria-labelledby="new-account-title">
          <Link className="text-link" href="/admin/manage-accounts">
            Back to accounts
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="new-account-title">Create account</h1>
        </section>

        <section className="panel">
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={createAccountAction} className="admin-form">
            <label>
              <span>Name</span>
              <input name="name" required type="text" />
            </label>
            <label>
              <span>Email</span>
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              <span>Account type</span>
              <select defaultValue="TEACHER" name="role" required>
                <option value="TEACHER">Teacher</option>
                <option value="RECEPTION">Reception</option>
              </select>
            </label>
            <label>
              <span>Initial password</span>
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
              <span>Active account</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/manage-accounts">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Create account
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
