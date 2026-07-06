import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateStudentAction } from "@/app/actions/students";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

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
  const t = getTranslations(currentUser.locale);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      fullName: true,
      isActive: true,
    },
  });

  if (!student) {
    notFound();
  }

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="edit-student-title">
          <Link className="text-link" href="/admin/students">
            {t("adminStudents.backToStudents")}
          </Link>
          <p className="eyebrow">{t("adminStudents.adminSetup")}</p>
          <h1 id="edit-student-title">{t("adminStudents.editStudent")}</h1>
        </section>

        <section className="panel">
          {query.error === "invalid" ? (
            <p className="form-error">{t("adminStudents.invalidError")}</p>
          ) : null}
          <form action={updateStudentAction} className="admin-form">
            <input name="studentId" type="hidden" value={student.id} />
            <label>
              <span>{t("adminStudents.fullName")}</span>
              <input
                defaultValue={student.fullName}
                name="fullName"
                required
                type="text"
              />
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={student.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>{t("adminStudents.activeStudent")}</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/students">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("adminStudents.saveStudent")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
