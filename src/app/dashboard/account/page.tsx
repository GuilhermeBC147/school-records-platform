import Link from "next/link";
import { redirect } from "next/navigation";
import {
  changeOwnPasswordAction,
  updateOwnDateFormatAction,
} from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import { accountDateFormatOptions } from "@/lib/date-format";
import { getCurrentUser } from "@/lib/session";

type AccountPageProps = {
  searchParams: Promise<{
    dateFormat?: string;
    password?: string;
  }>;
};

const passwordMessages = {
  current: "Enter your current password correctly before saving a new one.",
  invalid: "Use a new password with at least 8 characters and matching confirmation.",
  updated: "Password updated.",
} as const;

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const params = await searchParams;
  const passwordMessage =
    params.password && params.password in passwordMessages
      ? passwordMessages[params.password as keyof typeof passwordMessages]
      : null;
  const isSuccess = params.password === "updated";
  const dateFormatUpdated = params.dateFormat === "updated";

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
        <section className="intro" aria-labelledby="account-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Account</p>
          <h1 id="account-title">Your account</h1>
          <p className="lede">{currentUser.email}</p>
        </section>

        <section className="panel">
          <h2>Date format</h2>
          {dateFormatUpdated ? (
            <p className="form-success">Date format updated.</p>
          ) : null}
          <form action={updateOwnDateFormatAction} className="admin-form">
            <label>
              <span>Preferred date format</span>
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
                Save date format
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Change password</h2>
          {passwordMessage ? (
            <p className={isSuccess ? "form-success" : "form-error"}>
              {passwordMessage}
            </p>
          ) : null}
          <form action={changeOwnPasswordAction} className="admin-form">
            <label>
              <span>Current password</span>
              <input
                autoComplete="current-password"
                name="currentPassword"
                required
                type="password"
              />
            </label>
            <label>
              <span>New password</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="newPassword"
                required
                type="password"
              />
            </label>
            <label>
              <span>Confirm new password</span>
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
                Update password
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
