import Link from "next/link";
import { redirect } from "next/navigation";
import {
  approveSubstitutionAction,
  rejectSubstitutionAction,
  undoSubstitutionApprovalAction,
} from "@/app/actions/substitutions";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

function formatSubstitutionStatus(
  status: string,
  t: ReturnType<typeof getTranslations>,
) {
  const labels: Record<string, TranslationKey> = {
    APPROVED: "option.statusApproved",
    PENDING_APPROVAL: "option.statusPendingApproval",
    REJECTED: "option.statusRejected",
  };

  return labels[status] ? t(labels[status]) : status;
}

export default async function AdminSubstitutionsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const t = getTranslations(currentUser.locale);
  const substituteLessons = await prisma.lesson.findMany({
    where: {
      substitutionStatus: {
        in: ["PENDING_APPROVAL", "APPROVED", "REJECTED"],
      },
    },
    orderBy: [
      { lessonDate: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      id: true,
      lessonDate: true,
      name: true,
      status: true,
      substitutionNotes: true,
      substitutionReviewedAt: true,
      substitutionStatus: true,
      submittedAt: true,
      class: {
        select: {
          durationMinutes: true,
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
      substitutionReviewedBy: {
        select: {
          name: true,
        },
      },
      taughtBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="substitutions-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.adminReview")}</p>
          <h1 id="substitutions-title">{t("adminReview.substituteLessons")}</h1>
          <p className="lede">{t("adminReview.substituteLessonsCopy")}</p>
        </section>

        <section className="records-review" aria-label={t("adminReview.substituteLessons")}>
          {substituteLessons.map((lesson) => (
            <article className="panel data-panel record-review" key={lesson.id}>
              <div className="record-review-header">
                <div>
                  <p className="eyebrow">
                    {formatSubstitutionStatus(lesson.substitutionStatus, t)}
                  </p>
                  <h2>{lesson.class.name}</h2>
                  <p>
                    {t("label.lesson")}:{" "}
                    {lesson.name ?? t("adminReview.untitledLesson")}
                  </p>
                  <p>
                    {t("label.date")}:{" "}
                    {formatShortDate(lesson.lessonDate, currentUser.dateFormat)}
                  </p>
                  <p>
                    {t("adminReview.primaryTeacher")}:{" "}
                    {lesson.class.teacher.name}
                  </p>
                  <p>
                    {t("adminReview.substituteTeacher")}:{" "}
                    {lesson.taughtBy?.name ?? t("adminReview.unknown")}
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
                  {lesson.substitutionReviewedBy ? (
                    <p>
                      {t("adminReview.reviewedBy")}{" "}
                      {lesson.substitutionReviewedBy.name}
                      {lesson.substitutionReviewedAt
                        ? ` ${t("adminReview.onDate")} ${formatShortDateTime(
                          lesson.substitutionReviewedAt,
                          currentUser.dateFormat,
                        )}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="metric compact-metric">
                  <span>{formatDuration(lesson.class.durationMinutes)}</span>
                  <strong>{t("label.duration")}</strong>
                </div>
              </div>

              {lesson.substitutionNotes ? (
                <p className="record-notes">{lesson.substitutionNotes}</p>
              ) : null}

              {lesson.substitutionStatus === "PENDING_APPROVAL" ? (
                <div className="table-actions">
                  <form action={approveSubstitutionAction}>
                    <input name="lessonId" type="hidden" value={lesson.id} />
                    <button className="primary-button" type="submit">
                      {t("adminReview.approve")}
                    </button>
                  </form>
                  <form action={rejectSubstitutionAction}>
                    <input name="lessonId" type="hidden" value={lesson.id} />
                    <button className="secondary-button" type="submit">
                      {t("adminReview.reject")}
                    </button>
                  </form>
                </div>
              ) : null}
              {lesson.substitutionStatus === "APPROVED" ? (
                <div className="table-actions">
                  <form action={undoSubstitutionApprovalAction}>
                    <input name="lessonId" type="hidden" value={lesson.id} />
                    <button className="secondary-button" type="submit">
                      {t("adminReview.undoApproval")}
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}

          {substituteLessons.length === 0 ? (
            <article className="panel data-panel">
              <h2>{t("adminReview.noSubstituteLessons")}</h2>
              <p className="muted-copy">
                {t("adminReview.noSubstituteLessonsCopy")}
              </p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
