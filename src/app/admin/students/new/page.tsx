import Link from "next/link";
import { redirect } from "next/navigation";
import { createStudentAction } from "@/app/actions/students";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

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
  const t = getTranslations(currentUser.locale);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="new-student-title">
          <Link className="text-link" href="/admin/students">
            {t("adminStudents.backToStudents")}
          </Link>
          <p className="eyebrow">{t("adminStudents.adminSetup")}</p>
          <h1 id="new-student-title">{t("adminStudents.createStudent")}</h1>
        </section>

        <section className="panel">
          {params.error === "invalid" ? (
            <p className="form-error">{t("adminStudents.invalidError")}</p>
          ) : null}
          <form action={createStudentAction} className="admin-form">
            <label>
              <span>{t("adminStudents.fullName")}</span>
              <input name="fullName" required type="text" />
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="isActive" type="checkbox" />
              <span>{t("adminStudents.activeStudent")}</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/students">
                {t("label.cancel")}
              </Link>
              <button className="primary-button" type="submit">
                {t("adminStudents.createStudent")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
