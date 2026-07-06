import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentProfilePanel } from "@/app/components/student-profile-panel";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type ReceptionStudentsPageProps = {
  searchParams: Promise<{
    gradeClassId?: string;
    studentId?: string;
    studentSearch?: string;
  }>;
};

export default async function ReceptionStudentsPage({
  searchParams,
}: ReceptionStudentsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const t = getTranslations(currentUser.locale);
  const query = await searchParams;
  const studentSearch = query.studentSearch?.trim() || undefined;
  const students = await prisma.student.findMany({
    orderBy: { fullName: "asc" },
    where: {
      isActive: true,
      ...(studentSearch
        ? { fullName: { contains: studentSearch, mode: "insensitive" } }
        : {}),
    },
    take: 60,
    select: { id: true, fullName: true },
  });
  const selectedStudentId = query.studentId;

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="students-title">
          <Link className="text-link" href="/reception">
            {t("label.backToReception")}
          </Link>
          <p className="eyebrow">{t("dashboard.reception")}</p>
          <h1 id="students-title">{t("dashboard.students")}</h1>
          <p className="lede">{t("receptionLookup.studentsCopy")}</p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                {t("label.backToDashboard")}
              </Link>
            </div>
          ) : null}
        </section>

        <section className="panel" aria-label={t("label.studentSearch")}>
          <form className="filter-form compact-filter-form">
            <label>
              <span>{t("label.studentSearch")}</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="reception-students"
                name="studentSearch"
                placeholder={t("receptionLookup.studentSearchPlaceholder")}
                type="search"
              />
              <datalist id="reception-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.search")}
              </button>
              <Link className="text-link" href="/reception/students">
                {t("label.clear")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="student-results-title">
          <div className="section-heading-row">
            <div>
              <h2 id="student-results-title">{t("receptionLookup.studentResults")}</h2>
              <p className="muted-copy">
                {students.length}{" "}
                {students.length === 1
                  ? t("receptionLookup.activeStudentFound")
                  : t("receptionLookup.activeStudentsFound")}
              </p>
            </div>
          </div>
          <div className="student-result-grid">
            {students.map((student) => (
              <Link
                className={`student-result-card${
                  selectedStudentId === student.id ? " selected" : ""
                }`}
                href={`/reception/students?studentId=${student.id}`}
                key={student.id}
              >
                <span>{t("label.student")}</span>
                <strong>{student.fullName}</strong>
                <small>{t("receptionLookup.viewStudentDetails")}</small>
              </Link>
            ))}
            {students.length === 0 ? (
              <p className="muted-copy">{t("receptionLookup.noActiveStudentsFilter")}</p>
            ) : null}
          </div>
        </section>

        {selectedStudentId ? (
          <StudentProfilePanel
            basePath="/reception/students"
            dateFormat={currentUser.dateFormat}
            locale={currentUser.locale}
            selectedClassId={query.gradeClassId}
            studentId={selectedStudentId}
          />
        ) : null}
      </div>
    </main>
  );
}
