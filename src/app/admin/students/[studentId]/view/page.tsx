import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { StudentProfilePanel } from "@/app/components/student-profile-panel";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ViewStudentPageProps = {
  params: Promise<{
    studentId: string;
  }>;
  searchParams: Promise<{
    gradeClassId?: string;
  }>;
};

export default async function ViewStudentPage({
  params,
  searchParams,
}: ViewStudentPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { studentId } = await params;
  const query = await searchParams;
  const studentExists = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!studentExists) {
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
        <section className="intro" aria-labelledby="view-student-title">
          <Link className="text-link" href="/admin/students">
            Back to students
          </Link>
          <p className="eyebrow">Admin review</p>
          <h1 id="view-student-title">Student profile</h1>
          <div className="action-row">
            <Link className="secondary-link" href={`/admin/students/${studentId}`}>
              Edit student
            </Link>
          </div>
        </section>

        <StudentProfilePanel
          basePath={`/admin/students/${studentId}/view`}
          dateFormat={currentUser.dateFormat}
          selectedClassId={query.gradeClassId}
          studentId={studentId}
        />
      </div>
    </main>
  );
}
