import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment } from "react";
import { logoutAction } from "@/app/actions/auth";
import { updateClassGradesAction } from "@/app/actions/grades";
import { formatShortDate } from "@/lib/date-format";
import {
  formatGradeLabel,
  letterGradeOptions,
  partialEvaluationPeriods,
  testPeriods,
} from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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

export default async function ClassDetailPage({
  params,
  searchParams,
}: ClassDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { classId } = await params;
  const query = await searchParams;

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
        <section className="intro class-detail-hero" aria-labelledby="class-title">
          <div>
            <Link className="text-link" href="/dashboard">
              Back to dashboard
            </Link>
            <p className="eyebrow">
              {schoolClass.book ?? "Class"}
              {schoolClass.semester && schoolClass.year
                ? ` | Semester ${schoolClass.semester}/${schoolClass.year}`
                : ""}
            </p>
            <h1 id="class-title">{schoolClass.name}</h1>
            <p className="lede">
              Teacher: {schoolClass.teacher.name} ({schoolClass.teacher.email})
            </p>
            {schoolClass.isActive ? null : (
              <p className="muted-copy">Inactive</p>
            )}
            {query.grades === "saved" ? (
              <p className="form-success">Grades saved.</p>
            ) : null}
            {query.grades === "invalid" ? (
              <p className="form-error">
                Check the grade values and scores before saving.
              </p>
            ) : null}
            {query.grades === "incomplete" ? (
              <p className="form-error">
                Test grades need oral, composition, and written test values.
              </p>
            ) : null}
            <div className="action-row">
              <Link className="primary-link" href={`/dashboard/classes/${schoolClass.id}/record`}>
                New class record
              </Link>
            </div>
          </div>

          <div className="metric-grid compact-metrics" aria-label="Class totals">
            <article className="metric">
              <span>{schoolClass.enrollments.length}</span>
              <strong>Students</strong>
            </article>
            <article className="metric">
              <span>{schoolClass.lessons.length}</span>
              <strong>Recent Lessons</strong>
            </article>
          </div>
        </section>

        <section className="data-grid" aria-label="Class data">
          <article className="panel data-panel">
            <h2>Enrolled Students</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.student.fullName}</td>
                      <td>{enrollment.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel data-panel">
            <h2>Recent Lessons</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lesson</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Homework</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolClass.lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{lesson.name ?? "-"}</td>
                      <td>{formatShortDate(lesson.lessonDate)}</td>
                      <td>{lesson.status}</td>
                      <td>{lesson._count.attendanceRecords}</td>
                      <td>{lesson._count.homeworkRecords}</td>
                      <td>
                        <Link
                          className="text-link compact-link"
                          href={`/dashboard/classes/${schoolClass.id}/record?lessonId=${lesson.id}`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {schoolClass.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No lessons recorded yet.</td>
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
              <h2 id="grades-title">Grades</h2>
              <p className="muted-copy">
                Partial evaluations use letter grades. Test totals combine
                composition and written test scores.
              </p>
            </div>
          </div>

          <form action={updateClassGradesAction} className="grade-form">
            <input name="classId" type="hidden" value={schoolClass.id} />
            <div className="table-wrap">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>Student</th>
                    <th colSpan={partialEvaluationPeriods.length}>
                      Partial evaluations
                    </th>
                    {testPeriods.map((period) => (
                      <th colSpan={4} key={period.value}>
                        {period.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {partialEvaluationPeriods.map((period) => (
                      <th key={period.value}>{period.label}</th>
                    ))}
                    {testPeriods.map((period) => (
                      <Fragment key={period.value}>
                        <th key={`${period.value}:oral`}>Oral</th>
                        <th key={`${period.value}:composition`}>Comp.</th>
                        <th key={`${period.value}:written`}>Written</th>
                        <th key={`${period.value}:total`}>Total</th>
                      </Fragment>
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
                      {testPeriods.map((period) => {
                        const grade = findTestGrade(
                          enrollment.student.testGrades,
                          period.value,
                        );

                        return (
                          <Fragment key={period.value}>
                            <td key={`${period.value}:oral`}>
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
                            <td key={`${period.value}:composition`}>
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
                            <td key={`${period.value}:written`}>
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
                            <td key={`${period.value}:total`}>
                              {testTotal(grade)}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                  {schoolClass.enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={11}>No active students in this class.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="grade-scale">
              {letterGradeOptions.map((grade) => (
                <span key={grade.value}>{formatGradeLabel(grade.value)}</span>
              ))}
            </div>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                Save grades
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
