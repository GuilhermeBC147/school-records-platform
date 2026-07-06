import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type AdminRecordDetailPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

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

export default async function AdminRecordDetailPage({
  params,
}: AdminRecordDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const t = getTranslations(currentUser.locale);
  const { lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: "SUBMITTED",
    },
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
              email: true,
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
  });

  if (!lesson) {
    notFound();
  }

  const homeworkByStudentId = new Map(
    lesson.homeworkRecords.map((record) => [record.studentId, record.status]),
  );

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="record-detail-title">
          <Link className="text-link" href="/admin/records">
            {t("adminReview.backToRecords")}
          </Link>
          <p className="eyebrow">{t("adminReview.submittedRecord")}</p>
          <h1 id="record-detail-title">
            {lesson.name ?? t("adminReview.untitledLesson")}
          </h1>
          <p className="lede">
            {lesson.class.name} {t("dashboard.withTeacher")}{" "}
            {lesson.class.teacher.name}
          </p>
        </section>

        <section className="data-grid" aria-label={t("adminReview.recordSummary")}>
          <article className="panel data-panel">
            <h2>{t("adminReview.lessonDetails")}</h2>
            <dl className="detail-list">
              <div>
                <dt>{t("label.date")}</dt>
                <dd>{formatShortDate(lesson.lessonDate, currentUser.dateFormat)}</dd>
              </div>
              <div>
                <dt>{t("label.teacher")}</dt>
                <dd>
                  {lesson.class.teacher.name} ({lesson.class.teacher.email})
                </dd>
              </div>
              <div>
                <dt>{t("adminReview.submitted")}</dt>
                <dd>
                  {lesson.submittedBy?.name ?? t("adminReview.unknown")}
                  {lesson.submittedAt
                    ? ` ${t("adminReview.onDate")} ${formatShortDateTime(
                        lesson.submittedAt,
                        currentUser.dateFormat,
                      )}`
                    : ""}
                </dd>
              </div>
            </dl>
          </article>

          <article className="panel data-panel">
            <h2>{t("label.notes")}</h2>
            <p className="muted-copy">
              {lesson.notes ?? t("adminReview.noNotesRecorded")}
            </p>
          </article>
        </section>

        <section className="panel data-panel" aria-labelledby="student-records">
          <h2 id="student-records">{t("adminReview.studentRecords")}</h2>
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
        </section>
      </div>
    </main>
  );
}
