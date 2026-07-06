import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatShortDate } from "@/lib/date-format";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

export const dynamic = "force-dynamic";

function formatUserRole(role: string, t: ReturnType<typeof getTranslations>) {
  switch (role) {
    case "ADMIN":
      return t("accountManagement.adminSetup");
    case "RECEPTION":
      return t("accountManagement.reception");
    case "TEACHER":
      return t("accountManagement.teacher");
    default:
      return role;
  }
}

function formatLessonStatus(status: string, t: ReturnType<typeof getTranslations>) {
  switch (status) {
    case "DRAFT":
      return t("option.statusDraft");
    case "SUBMITTED":
      return t("option.statusSubmitted");
    default:
      return status;
  }
}

export default async function AdminDataPage() {
  const currentUser = await getCurrentUser();
  const t = getTranslations(currentUser?.locale ?? defaultUnauthenticatedLocale);
  const [teachers, classes, students, recentLessons] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: { classes: true },
        },
      },
    }),
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        book: true,
        semester: true,
        year: true,
        teacher: {
          select: { name: true },
        },
        _count: {
          select: {
            enrollments: true,
            lessons: true,
          },
        },
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: { enrollments: true },
        },
      },
    }),
    prisma.lesson.findMany({
      orderBy: { lessonDate: "desc" },
      take: 5,
      select: {
        id: true,
        lessonDate: true,
        status: true,
        class: {
          select: { name: true },
        },
        submittedBy: {
          select: { name: true },
        },
        _count: {
          select: {
            attendanceRecords: true,
            homeworkRecords: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>{t("app.name")}</strong>
            <span>{t("data.databasePreview")}</span>
          </div>
          <Link className="text-link" href="/">
            {t("data.home")}
          </Link>
        </div>
      </header>

      <div className="main data-page">
        <section className="intro" aria-labelledby="data-title">
          <p className="eyebrow">{t("data.sprint")}</p>
          <h1 id="data-title">{t("data.title")}</h1>
          <p className="lede">{t("data.introCopy")}</p>

          <div className="metric-grid" aria-label={t("data.databaseRecordCounts")}>
            <article className="metric">
              <span>{teachers.length}</span>
              <strong>{t("label.users")}</strong>
            </article>
            <article className="metric">
              <span>{classes.length}</span>
              <strong>{t("dashboard.classes")}</strong>
            </article>
            <article className="metric">
              <span>{students.length}</span>
              <strong>{t("dashboard.students")}</strong>
            </article>
            <article className="metric">
              <span>{recentLessons.length}</span>
              <strong>{t("label.recentLessons")}</strong>
            </article>
          </div>
        </section>

        <section className="data-grid" aria-label={t("data.databaseTables")}>
          <article className="panel data-panel">
            <h2>{t("data.teachersAndAdmins")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.name")}</th>
                    <th>{t("account.email")}</th>
                    <th>{t("accountManagement.accountType")}</th>
                    <th>{t("dashboard.classes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.name}</td>
                      <td>{teacher.email}</td>
                      <td>{formatUserRole(teacher.role, t)}</td>
                      <td>{teacher._count.classes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>{t("dashboard.classes")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.class")}</th>
                    <th>{t("label.book")}</th>
                    <th>{t("label.term")}</th>
                    <th>{t("label.teacher")}</th>
                    <th>{t("dashboard.students")}</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((schoolClass) => (
                    <tr key={schoolClass.id}>
                      <td>{schoolClass.name}</td>
                      <td>{schoolClass.book ?? "-"}</td>
                      <td>
                        {schoolClass.semester && schoolClass.year
                          ? `${t("dashboard.semester")} ${schoolClass.semester}/${schoolClass.year}`
                          : "-"}
                      </td>
                      <td>{schoolClass.teacher.name}</td>
                      <td>{schoolClass._count.enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>{t("dashboard.students")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.name")}</th>
                    <th>{t("dashboard.classes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.fullName}</td>
                      <td>{student._count.enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>{t("data.recentLessons")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.date")}</th>
                    <th>{t("label.class")}</th>
                    <th>{t("label.status")}</th>
                    <th>{t("label.teacher")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        {formatShortDate(
                          lesson.lessonDate,
                          currentUser?.dateFormat,
                        )}
                      </td>
                      <td>{lesson.class.name}</td>
                      <td>{formatLessonStatus(lesson.status, t)}</td>
                      <td>{lesson.submittedBy?.name ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
