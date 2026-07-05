import Link from "next/link";
import { redirect } from "next/navigation";
import {
  approveSubstitutionAction,
  rejectSubstitutionAction,
  undoSubstitutionApprovalAction,
} from "@/app/actions/substitutions";
import { logoutAction } from "@/app/actions/auth";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate, formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminSubstitutionsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

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
        <section className="intro" aria-labelledby="substitutions-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin review</p>
          <h1 id="substitutions-title">Substitute lessons</h1>
          <p className="lede">
            Review substitute lesson claims. Attendance and homework are saved
            immediately; approval decides whether the hours count for payroll.
          </p>
        </section>

        <section className="records-review" aria-label="Substitute lessons">
          {substituteLessons.map((lesson) => (
            <article className="panel data-panel record-review" key={lesson.id}>
              <div className="record-review-header">
                <div>
                  <p className="eyebrow">{lesson.substitutionStatus}</p>
                  <h2>{lesson.class.name}</h2>
                  <p>Lesson: {lesson.name ?? "Untitled lesson"}</p>
                  <p>Date: {formatShortDate(lesson.lessonDate)}</p>
                  <p>Primary teacher: {lesson.class.teacher.name}</p>
                  <p>Substitute teacher: {lesson.taughtBy?.name ?? "Unknown"}</p>
                  <p>
                    Submitted by {lesson.submittedBy?.name ?? "Unknown"}
                    {lesson.submittedAt
                      ? ` on ${formatShortDateTime(lesson.submittedAt)}`
                      : ""}
                  </p>
                  {lesson.substitutionReviewedBy ? (
                    <p>
                      Reviewed by {lesson.substitutionReviewedBy.name}
                      {lesson.substitutionReviewedAt
                        ? ` on ${formatShortDateTime(
                            lesson.substitutionReviewedAt,
                          )}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="metric compact-metric">
                  <span>{formatDuration(lesson.class.durationMinutes)}</span>
                  <strong>Duration</strong>
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
                      Approve
                    </button>
                  </form>
                  <form action={rejectSubstitutionAction}>
                    <input name="lessonId" type="hidden" value={lesson.id} />
                    <button className="secondary-button" type="submit">
                      Reject
                    </button>
                  </form>
                </div>
              ) : null}
              {lesson.substitutionStatus === "APPROVED" ? (
                <div className="table-actions">
                  <form action={undoSubstitutionApprovalAction}>
                    <input name="lessonId" type="hidden" value={lesson.id} />
                    <button className="secondary-button" type="submit">
                      Undo approval
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}

          {substituteLessons.length === 0 ? (
            <article className="panel data-panel">
              <h2>No substitute lessons yet</h2>
              <p className="muted-copy">
                Substitute lesson records submitted by teachers will appear here.
              </p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
