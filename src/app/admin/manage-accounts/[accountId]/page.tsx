import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateAccountAction } from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type EditAccountPageProps = {
  params: Promise<{
    accountId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages = {
  duplicate: "A user with that email already exists.",
  invalid: "Enter a name, email, account type, and optional password with at least 8 characters.",
  self: "You cannot deactivate your own account.",
};

export default async function EditAccountPage({
  params,
  searchParams,
}: EditAccountPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { accountId } = await params;
  const query = await searchParams;
  const account = await prisma.user.findFirst({
    where: {
      id: accountId,
      role: { in: ["TEACHER", "RECEPTION"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!account) {
    notFound();
  }

  const errorMessage =
    query.error && query.error in errorMessages
      ? errorMessages[query.error as keyof typeof errorMessages]
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
        <section className="intro" aria-labelledby="edit-account-title">
          <Link className="text-link" href="/admin/manage-accounts">
            Back to accounts
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="edit-account-title">Edit account</h1>
        </section>

        <section className="panel">
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={updateAccountAction} className="admin-form">
            <input name="accountId" type="hidden" value={account.id} />
            <label>
              <span>Name</span>
              <input defaultValue={account.name} name="name" required type="text" />
            </label>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                defaultValue={account.email}
                name="email"
                required
                type="email"
              />
            </label>
            <label>
              <span>Account type</span>
              <select defaultValue={account.role} name="role" required>
                <option value="TEACHER">Teacher</option>
                <option value="RECEPTION">Reception</option>
              </select>
            </label>
            <label>
              <span>New password</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="password"
                placeholder="Leave blank to keep current password"
                type="password"
              />
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={account.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>Active account</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/manage-accounts">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Save account
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
