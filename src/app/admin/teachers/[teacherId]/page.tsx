import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTeacherAction } from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type EditTeacherPageProps = {
  params: Promise<{
    teacherId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages = {
  duplicate: "A user with that email already exists.",
  invalid: "Enter a name, email, and optional password with at least 8 characters.",
  self: "You cannot deactivate your own account.",
};

export default async function EditTeacherPage({
  params,
  searchParams,
}: EditTeacherPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { teacherId } = await params;
  const query = await searchParams;
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: "TEACHER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

  if (!teacher) {
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
        <section className="intro" aria-labelledby="edit-teacher-title">
          <Link className="text-link" href="/admin/teachers">
            Back to teachers
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="edit-teacher-title">Edit teacher</h1>
        </section>

        <section className="panel">
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <form action={updateTeacherAction} className="admin-form">
            <input name="teacherId" type="hidden" value={teacher.id} />
            <label>
              <span>Name</span>
              <input defaultValue={teacher.name} name="name" required type="text" />
            </label>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                defaultValue={teacher.email}
                name="email"
                required
                type="email"
              />
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
                defaultChecked={teacher.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>Active account</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/teachers">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Save teacher
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
