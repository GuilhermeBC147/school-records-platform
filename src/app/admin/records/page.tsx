import Link from "next/link";
import { redirect } from "next/navigation";
import { DateInput } from "@/app/components/date-input";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type AdminRecordsPageProps = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    studentId?: string;
    teacherId?: string;
  }>;
};

function readFilterValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function readFilterDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month - 1, day + 1));

  return { end, start };
}

function buildExportHref(filters: {
  classId?: string;
  date?: string;
  studentId?: string;
  teacherId?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/admin/records/export?${query}` : "/admin/records/export";
}

function formatAttendanceStatus(status: string, t: ReturnType<typeof getTranslations>) {
  const labels: Record<string, TranslationKey> = {
    ABSENT: "option.attendanceAbsent",
    EXCUSED: "option.attendanceExcused",
    LATE: "option.attendanceLate",
    PRESENT: "option.attendancePresent",
  };

  return labels[status] ? t(labels[status]) : status;
}

function formatHomeworkStatus(status: string, t: ReturnType<typeof getTranslations>) {
  const labels: Record<string, TranslationKey> = {
    COMPLETED: "option.attendanceComplete",
    INCOMPLETE: "option.attendanceNotDone",
  };

  return labels[status] ? t(labels[status]) : status;
}

export default async function AdminRecordsPage({
  searchParams,
}: AdminRecordsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const t = getTranslations(currentUser.locale);
  const filters = await searchParams;
  const classId = readFilterValue(filters.classId);
  const dateRange = readFilterDate(filters.date);
  const studentId = readFilterValue(filters.studentId);
  const teacherId = readFilterValue(filters.teacherId);

  const [classes, students, teachers, submittedLessons] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.lesson.findMany({
      where: {
        status: "SUBMITTED",
        ...(classId ? { classId } : {}),
        ...(dateRange
          ? {
              lessonDate: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            }
          : {}),
        ...(teacherId ? { class: { teacherId } } : {}),
        ...(studentId
          ? {
              attendanceRecords: {
                some: { studentId },
              },
            }
          : {}),
      },
    orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      lessonDate: true,
      notes: true,
      submittedAt: true,
      class: {
        select: {
          name: true,
          teacher: {
            select: {
              name: true,
            },
          },
        },
      },
      submittedBy: {
        select: {
          name: true,
        },
      },
      attendanceRecords: {
        orderBy: {
          student: { fullName: "asc" },
        },
        select: {
          id: true,
          status: true,
          student: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
      homeworkRecords: {
        select: {
          status: true,
          studentId: true,
        },
      },
    },
    }),
  ]);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="records-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.adminReview")}</p>
          <h1 id="records-title">{t("adminReview.submittedRecordsTitle")}</h1>
          <p className="lede">{t("adminReview.recordsCopy")}</p>
          <div className="action-row">
            <Link className="primary-link" href={buildExportHref(filters)}>
              {t("adminReview.exportCsv")}
            </Link>
          </div>
        </section>

        <section className="panel" aria-label={t("adminReview.recordFilters")}>
          <form className="filter-form">
            <label>
              <span>{t("label.teacher")}</span>
              <select defaultValue={teacherId ?? ""} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.class")}</span>
              <select defaultValue={classId ?? ""} name="classId">
                <option value="">{t("label.allClasses")}</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.student")}</span>
              <select defaultValue={studentId ?? ""} name="studentId">
                <option value="">{t("label.allStudents")}</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.date")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                defaultValue={filters.date ?? ""}
                name="date"
              />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.applyFilters")}
              </button>
              <Link className="text-link" href="/admin/records">
                {t("label.clear")}
              </Link>
            </div>
          </form>
        </section>

        <section className="records-review" aria-label={t("adminReview.submittedRecords")}>
          {submittedLessons.map((lesson) => {
            const homeworkByStudentId = new Map(
              lesson.homeworkRecords.map((record) => [
                record.studentId,
                record.status,
              ]),
            );

            return (
              <article className="panel data-panel record-review" key={lesson.id}>
                <div className="record-review-header">
                  <div>
                    <p className="eyebrow">{t("adminReview.submittedRecord")}</p>
                    <h2>{lesson.class.name}</h2>
                    <p>
                      {t("adminReview.lessonName")}:{" "}
                      {lesson.name ?? t("adminReview.untitledLesson")}
                    </p>
                    <p>
                      {t("label.lesson")}:{" "}
                      {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                      {" | "}
                      {t("label.teacher")}: {lesson.class.teacher.name}
                    </p>
                    <p>
                      {t("adminReview.submittedBy")}{" "}
                      {lesson.submittedBy?.name ?? t("adminReview.unknown")}
                      {lesson.submittedAt
                        ? ` ${t("adminReview.onDate")} ${formatShortDateTime(
                            lesson.submittedAt,
                            currentUser.dateFormat,
                          )}`
                        : ""}
                    </p>
                  </div>
                  <div className="metric compact-metric">
                    <span>{lesson.attendanceRecords.length}</span>
                    <strong>{t("label.students")}</strong>
                  </div>
                </div>

                {lesson.notes ? <p className="record-notes">{lesson.notes}</p> : null}

                <div className="record-actions">
                  <Link className="primary-link" href={`/admin/records/${lesson.id}`}>
                    {t("adminReview.viewDetails")}
                  </Link>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("label.student")}</th>
                        <th>{t("label.attendance")}</th>
                        <th>{t("label.homework")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.attendanceRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{record.student.fullName}</td>
                          <td>{formatAttendanceStatus(record.status, t)}</td>
                          <td>
                            {formatHomeworkStatus(
                              homeworkByStudentId.get(record.student.id) ??
                                "INCOMPLETE",
                              t,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}

          {submittedLessons.length === 0 ? (
            <article className="panel data-panel">
              <h2>{t("adminReview.noSubmittedRecords")}</h2>
              <p className="muted-copy">
                {t("adminReview.noSubmittedRecordsCopy")}
              </p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
