import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateClassGradesAction } from "@/app/actions/grades";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import {
  formatGradeLabel,
  formatPartialEvaluationPeriodLabel,
  formatTestPeriodLabel,
  letterGradeOptions,
  partialEvaluationPeriods,
  testPeriods,
} from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type ClassDetailPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    grades?: string;
  }>;
};

function findPartialGrade(
  grades: { grade: string; period: string }[],
  period: string,
) {
  return grades.find((grade) => grade.period === period)?.grade ?? "";
}

function findTestGrade<
  T extends {
    compositionScore: { toString: () => string };
    oralGrade: string;
    period: string;
    writtenTestScore: { toString: () => string };
  },
>(grades: T[], period: string) {
  return grades.find((grade) => grade.period === period) ?? null;
}

function formatScore(score: { toString: () => string }) {
  return score.toString().replace(/\.00$/, "");
}

function testTotal(
  grade: {
    compositionScore: { toString: () => string };
    writtenTestScore: { toString: () => string };
  } | null,
) {
  if (!grade) {
    return "-";
  }

  return (Number(grade.compositionScore) + Number(grade.writtenTestScore))
    .toFixed(2)
    .replace(/\.00$/, "");
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

export default async function ClassDetailPage({
  params,
  searchParams,
}: ClassDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN" && currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const { classId } = await params;
  const query = await searchParams;
  const t = getTranslations(currentUser.locale);

  const schoolClass = await prisma.class.findFirst({
    where: {
      id: classId,
      isActive: true,
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    select: {
      id: true,
      name: true,
      book: true,
      semester: true,
      year: true,
      durationMinutes: true,
      weekDays: true,
      isActive: true,
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
      enrollments: {
        where: {
          status: "ACTIVE",
          student: {
            isActive: true,
          },
        },
        orderBy: {
          student: {
            fullName: "asc",
          },
        },
        select: {
          id: true,
          status: true,
          student: {
            select: {
              id: true,
              fullName: true,
              partialEvaluationGrades: {
                where: { classId },
                select: {
                  grade: true,
                  period: true,
                },
              },
              testGrades: {
                where: { classId },
                select: {
                  compositionScore: true,
                  oralGrade: true,
                  period: true,
                  writtenTestScore: true,
                },
              },
            },
          },
        },
      },
      lessons: {
        orderBy: {
          lessonDate: "desc",
        },
        take: 8,
        select: {
          id: true,
          name: true,
          lessonDate: true,
          status: true,
          _count: {
            select: {
              attendanceRecords: true,
              homeworkRecords: true,
            },
          },
        },
      },
    },
  });

  if (!schoolClass) {
    notFound();
  }

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro class-detail-hero" aria-labelledby="class-title">
          <div>
              <Link className="text-link" href="/dashboard">
              {t("label.backToDashboard")}
            </Link>
            <p className="eyebrow">
              {schoolClass.book ?? t("label.classFallback")}
              {schoolClass.semester && schoolClass.year
                ? ` | ${t("dashboard.semester")} ${schoolClass.semester}/${schoolClass.year}`
                : ""}
            </p>
            <h1 id="class-title">{schoolClass.name}</h1>
            <p className="lede">
              {t("label.teacher")}: {schoolClass.teacher.name} ({schoolClass.teacher.email})
            </p>
            <p className="muted-copy">
              {formatWeekdays(schoolClass.weekDays, currentUser.locale)} |{" "}
              {formatDuration(schoolClass.durationMinutes)}
            </p>
            {schoolClass.isActive ? null : (
              <p className="muted-copy">{t("label.inactive")}</p>
            )}
            {query.grades === "saved" ? (
              <p className="form-success">{t("message.gradesSaved")}</p>
            ) : null}
            {query.grades === "invalid" ? (
              <p className="form-error">{t("message.gradeInvalid")}</p>
            ) : null}
            {query.grades === "incomplete" ? (
              <p className="form-error">{t("message.gradeIncomplete")}</p>
            ) : null}
            <div className="action-row">
              <Link className="primary-link" href={`/dashboard/classes/${schoolClass.id}/record`}>
                {t("label.addLesson")}
              </Link>
            </div>
          </div>

          <div className="metric-grid compact-metrics" aria-label={t("label.classTotals")}>
            <article className="metric">
              <span>{schoolClass.enrollments.length}</span>
              <strong>{t("label.students")}</strong>
            </article>
            <article className="metric">
              <span>{schoolClass.lessons.length}</span>
              <strong>{t("label.recentLessons")}</strong>
            </article>
          </div>
        </section>

        <section className="data-grid" aria-label={t("label.classData")}>
          <article className="panel data-panel">
            <h2>{t("label.enrolledStudents")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.name")}</th>
                    <th>{t("label.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.student.fullName}</td>
                      <td>{enrollment.status === "ACTIVE" ? t("label.active") : t("label.inactive")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>{t("label.recentLessons")}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("label.lesson")}</th>
                    <th>{t("label.date")}</th>
                    <th>{t("label.status")}</th>
                    <th>{t("label.attendance")}</th>
                    <th>{t("label.homework")}</th>
                    <th>{t("label.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{lesson.name ?? "-"}</td>
                      <td>
                        {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                      </td>
                      <td>{formatLessonStatus(lesson.status, t)}</td>
                      <td>{lesson._count.attendanceRecords}</td>
                      <td>{lesson._count.homeworkRecords}</td>
                      <td>
                        <Link
                          className="text-link compact-link"
                          href={`/dashboard/classes/${schoolClass.id}/record?lessonId=${lesson.id}`}
                        >
                          {t("label.edit")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {schoolClass.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={6}>{t("message.noLessonsRecorded")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="panel data-panel" aria-labelledby="grades-title">
          <div className="section-heading-row">
            <div>
              <h2 id="grades-title">{t("label.grades")}</h2>
              <p className="muted-copy">{t("text.gradesCopy")}</p>
            </div>
          </div>

          <form action={updateClassGradesAction} className="grade-form">
            <input name="classId" type="hidden" value={schoolClass.id} />
            <div className="grade-section">
              <div className="grade-section-heading">
                <h3>{t("label.partialEvaluations")}</h3>
                <p>{t("text.partialEvaluationsCopy")}</p>
              </div>
              <div className="table-wrap">
                <table className="grade-table partial-grade-table">
                  <thead>
                    <tr>
                      <th>{t("label.student")}</th>
                      {partialEvaluationPeriods.map((period) => (
                        <th key={period.value}>
                          {formatPartialEvaluationPeriodLabel(
                            period.value,
                            currentUser.locale,
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schoolClass.enrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>{enrollment.student.fullName}</td>
                        {partialEvaluationPeriods.map((period) => (
                          <td key={period.value}>
                            <select
                              defaultValue={findPartialGrade(
                                enrollment.student.partialEvaluationGrades,
                                period.value,
                              )}
                              name={`partial:${enrollment.student.id}:${period.value}`}
                            >
                              <option value="">-</option>
                              {letterGradeOptions.map((grade) => (
                                <option key={grade.value} value={grade.value}>
                                  {grade.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {schoolClass.enrollments.length === 0 ? (
                      <tr>
                        <td colSpan={3}>{t("message.noActiveStudentsInClass")}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {testPeriods.map((period) => (
              <div className="grade-section" key={period.value}>
                <div className="grade-section-heading">
                  <h3>{formatTestPeriodLabel(period.value, currentUser.locale)}</h3>
                  <p>{t("text.testGradesCopy")}</p>
                </div>
                <div className="table-wrap">
                  <table className="grade-table test-grade-table">
                    <thead>
                      <tr>
                        <th>{t("label.student")}</th>
                        <th>{t("label.oral")}</th>
                        <th>{t("label.composition")}</th>
                        <th>{t("label.written")}</th>
                        <th>{t("label.testTotal")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolClass.enrollments.map((enrollment) => {
                        const grade = findTestGrade(
                          enrollment.student.testGrades,
                          period.value,
                        );

                        return (
                          <tr key={enrollment.id}>
                            <td>{enrollment.student.fullName}</td>
                            <td>
                              <select
                                defaultValue={grade?.oralGrade ?? ""}
                                name={`oral:${enrollment.student.id}:${period.value}`}
                              >
                                <option value="">-</option>
                                {letterGradeOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                defaultValue={
                                  grade
                                    ? formatScore(grade.compositionScore)
                                    : ""
                                }
                                max="2"
                                min="0"
                                name={`composition:${enrollment.student.id}:${period.value}`}
                                step="0.01"
                                type="number"
                              />
                            </td>
                            <td>
                              <input
                                defaultValue={
                                  grade
                                    ? formatScore(grade.writtenTestScore)
                                    : ""
                                }
                                max="8"
                                min="0"
                                name={`written:${enrollment.student.id}:${period.value}`}
                                step="0.01"
                                type="number"
                              />
                            </td>
                            <td className="grade-total">{testTotal(grade)}</td>
                          </tr>
                        );
                      })}
                      {schoolClass.enrollments.length === 0 ? (
                        <tr>
                          <td colSpan={5}>{t("message.noActiveStudentsInClass")}</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="grade-scale">
              {letterGradeOptions.map((grade) => (
                <span key={grade.value}>{formatGradeLabel(grade.value)}</span>
              ))}
            </div>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("label.saveGrades")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
