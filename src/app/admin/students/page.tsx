import Link from "next/link";
import { redirect } from "next/navigation";
import { formatEntityResultMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type AdminStudentsPageProps = {
  searchParams: Promise<{
    status?: string;
    studentSearch?: string;
  }>;
};

export default async function AdminStudentsPage({
  searchParams,
}: AdminStudentsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const t = getTranslations(currentUser.locale);
  const studentSearch = params.studentSearch?.trim() || undefined;
  const successMessage = formatEntityResultMessage(
    "Student",
    params.status,
    currentUser.locale,
  );
  const students = await prisma.student.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    where: {
      ...(studentSearch
        ? { fullName: { contains: studentSearch, mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      isActive: true,
      _count: {
        select: { enrollments: true },
      },
    },
  });

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="students-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("adminStudents.adminSetup")}</p>
          <h1 id="students-title">{t("dashboard.students")}</h1>
          <p className="lede">{t("adminStudents.createCopy")}</p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/students/new">
              {t("adminStudents.createStudent")}
            </Link>
          </div>
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <section className="panel" aria-label={t("adminStudents.studentFilters")}>
          <form className="filter-form compact-filter-form">
            <label>
              <span>{t("adminStudents.studentName")}</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="admin-students"
                name="studentSearch"
                placeholder={t("receptionLookup.studentSearchPlaceholder")}
                type="search"
              />
              <datalist id="admin-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.search")}
              </button>
              <Link className="text-link" href="/admin/students">
                {t("label.clear")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="admin-student-results-title">
          <div className="section-heading-row">
            <div>
              <h2 id="admin-student-results-title">
                {t("adminStudents.studentResults")}
              </h2>
              <p className="muted-copy">
                {students.length}{" "}
                {students.length === 1
                  ? t("adminStudents.studentFound")
                  : t("adminStudents.studentsFound")}
              </p>
            </div>
          </div>
          <div className="student-result-grid">
            {students.map((student) => (
              <article className="student-result-card" key={student.id}>
                <span>
                  {student.isActive
                    ? t("adminStudents.activeStudent")
                    : t("adminStudents.inactiveStudent")}
                </span>
                <strong>{student.fullName}</strong>
                <small>
                  {t("adminStudents.enrolledIn")} {student._count.enrollments}{" "}
                  {student._count.enrollments === 1
                    ? t("label.class")
                    : t("dashboard.classes")}
                </small>
                <div className="card-actions">
                  <Link
                    className="secondary-link compact-card-link"
                    href={`/admin/students/${student.id}/view`}
                  >
                    {t("label.view")}
                  </Link>
                  <Link
                    className="text-link compact-card-link"
                    href={`/admin/students/${student.id}`}
                  >
                    {t("label.edit")}
                  </Link>
                </div>
              </article>
            ))}
            {students.length === 0 ? (
              <p className="muted-copy">{t("adminStudents.noMatches")}</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
