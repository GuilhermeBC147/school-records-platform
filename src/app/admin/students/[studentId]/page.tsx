import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateStudentAction } from "@/app/actions/students";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type EditStudentPageProps = {
  params: Promise<{
    studentId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditStudentPage({
  params,
  searchParams,
}: EditStudentPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { studentId } = await params;
  const query = await searchParams;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      fullName: true,
      preferredName: true,
      isActive: true,
    },
  });

  if (!student) {
    notFound();
  }

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
        <section className="intro" aria-labelledby="edit-student-title">
          <Link className="text-link" href="/admin/students">
            Back to students
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="edit-student-title">Edit student</h1>
        </section>

        <section className="panel">
          {query.error === "invalid" ? (
            <p className="form-error">Enter the student's full name.</p>
          ) : null}
          <form action={updateStudentAction} className="admin-form">
            <input name="studentId" type="hidden" value={student.id} />
            <label>
              <span>Full name</span>
              <input
                defaultValue={student.fullName}
                name="fullName"
                required
                type="text"
              />
            </label>
            <label>
              <span>Preferred name</span>
              <input
                defaultValue={student.preferredName ?? ""}
                name="preferredName"
                type="text"
              />
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={student.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>Active student</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/students">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Save student
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
