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
    studentStatus?: string;
  }>;
};

type StudentStatusFilter = "all" | "active" | "inactive";

function readStudentStatusFilter(value: string | undefined): StudentStatusFilter {
  if (value === "all" || value === "inactive") {
    return value;
  }

  return "active";
}

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
  const studentStatus = readStudentStatusFilter(params.studentStatus?.trim());
  const successMessage = formatEntityResultMessage(
    "Student",
    params.status,
    currentUser.locale,
  );
  const students = await prisma.student.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    where: {
      ...(studentStatus === "active" ? { isActive: true } : {}),
      ...(studentStatus === "inactive" ? { isActive: false } : {}),
      ...(studentSearch
        ? { fullName: { contains: studentSearch, mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      enrollmentIdentifier: true,
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
            <Link className="secondary-link" href="/admin/students/import">
              {t("imports.importStudents")}
            </Link>
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
            <label>
              <span>{t("label.status")}</span>
              <select defaultValue={studentStatus} name="studentStatus">
                <option value="active">{t("adminStudents.activeStudents")}</option>
                <option value="inactive">{t("adminStudents.inactiveStudents")}</option>
                <option value="all">{t("adminStudents.allStudents")}</option>
              </select>
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
              <Link
                className="student-result-card"
                href={`/admin/students/${student.id}/view`}
                key={student.id}
              >
                <span>
                  {student.isActive
                    ? t("adminStudents.activeStudent")
                    : t("adminStudents.inactiveStudent")}
                </span>
                <strong>{student.fullName}</strong>
                <small>
                  {student.enrollmentIdentifier ??
                    t("adminStudents.noEnrollmentIdentifier")}
                </small>
                <small>
                  {t("adminStudents.enrolledIn")} {student._count.enrollments}{" "}
                  {student._count.enrollments === 1
                    ? t("label.class")
                    : t("dashboard.classes")}
                </small>
              </Link>
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
