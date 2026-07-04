import Link from "next/link";
import { redirect } from "next/navigation";
import { createStudentAction } from "@/app/actions/students";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";

type NewStudentPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewStudentPage({
  searchParams,
}: NewStudentPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;

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
        <section className="intro" aria-labelledby="new-student-title">
          <Link className="text-link" href="/admin/students">
            Back to students
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="new-student-title">Create student</h1>
        </section>

        <section className="panel">
          {params.error === "invalid" ? (
            <p className="form-error">Enter the student's full name.</p>
          ) : null}
          <form action={createStudentAction} className="admin-form">
            <label>
              <span>Full name</span>
              <input name="fullName" required type="text" />
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="isActive" type="checkbox" />
              <span>Active student</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/students">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Create student
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
