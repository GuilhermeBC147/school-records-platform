import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudentProfilePanel } from "@/app/components/student-profile-panel";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

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
  const t = getTranslations(currentUser.locale);
  const studentExists = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!studentExists) {
    notFound();
  }

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="view-student-title">
          <Link className="text-link" href="/admin/students">
            {t("adminStudents.backToStudents")}
          </Link>
          <p className="eyebrow">{t("label.adminReview")}</p>
          <h1 id="view-student-title">{t("adminStudents.studentProfile")}</h1>
          <div className="action-row">
            <Link className="secondary-link" href={`/admin/students/${studentId}`}>
              {t("adminStudents.editStudent")}
            </Link>
          </div>
        </section>

        <StudentProfilePanel
          basePath={`/admin/students/${studentId}/view`}
          dateFormat={currentUser.dateFormat}
          locale={currentUser.locale}
          selectedClassId={query.gradeClassId}
          studentId={studentId}
        />
      </div>
    </main>
  );
}
