import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  saveDraftClassRecordAction,
  submitClassRecordAction,
} from "@/app/actions/class-records";
import { DateInput } from "@/app/components/date-input";
import { formatShortDateInput } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type ClassRecordPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    lessonId?: string;
    substitute?: string;
  }>;
};

function todayInputValue() {
  const date = new Date();
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${year}-${month}-${day}`;
}

function findStudentStatus<T extends { studentId: string; status: string }>(
  records: T[],
  studentId: string,
  fallback: string,
) {
  return records.find((record) => record.studentId === studentId)?.status ?? fallback;
}

export default async function ClassRecordPage({
  params,
  searchParams,
}: ClassRecordPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN" && currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const { classId } = await params;
  const { lessonId, substitute } = await searchParams;
  const t = getTranslations(currentUser.locale);
  const isSubstituteRecord = currentUser.role === "TEACHER" && substitute === "1";

  const schoolClass = await prisma.class.findFirst({
    where: {
      id: classId,
      isActive: true,
      ...(currentUser.role === "TEACHER" && !isSubstituteRecord
        ? { teacherId: currentUser.id }
        : {}),
    },
    select: {
      id: true,
      name: true,
      book: true,
      semester: true,
      year: true,
      teacher: {
        select: { name: true },
      },
      enrollments: {
        where: {
          status: "ACTIVE",
          student: {
            isActive: true,
          },
        },
        orderBy: {
          student: { fullName: "asc" },
        },
        select: {
          id: true,
          student: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
      lessons: {
        where: lessonId ? { id: lessonId } : { status: "DRAFT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          name: true,
          lessonDate: true,
          notes: true,
          status: true,
          substitutionNotes: true,
          substitutionStatus: true,
          attendanceRecords: {
            select: {
              studentId: true,
              status: true,
            },
          },
          homeworkRecords: {
            select: {
              studentId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!schoolClass) {
    notFound();
  }

  const lessonRecord = schoolClass.lessons[0];

  if (lessonId && !lessonRecord) {
    notFound();
  }

  const isEditingSubmitted = lessonRecord?.status === "SUBMITTED";
  const isPendingSubstitution =
    lessonRecord?.substitutionStatus === "PENDING_APPROVAL";

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="record-title">
          <Link className="text-link" href={`/dashboard/classes/${schoolClass.id}`}>
            {t("label.backToClass")}
          </Link>
          <p className="eyebrow">
            {schoolClass.book ?? t("label.classFallback")}
            {schoolClass.semester && schoolClass.year
              ? ` | ${t("dashboard.semester")} ${schoolClass.semester}/${schoolClass.year}`
              : ""}
          </p>
          <h1 id="record-title">
            {isSubstituteRecord
              ? t("label.substituteClassRecord")
              : isEditingSubmitted
                ? t("label.editClassRecord")
                : t("label.classRecord")}
          </h1>
          <p className="lede">
            {schoolClass.name} {t("dashboard.withTeacher")} {schoolClass.teacher.name}
          </p>
          {isSubstituteRecord || isPendingSubstitution ? (
            <p className="muted-copy">{t("text.classRecordSubstitutionCopy")}</p>
          ) : null}
        </section>

        <form action={submitClassRecordAction} className="record-form">
          <input name="classId" type="hidden" value={schoolClass.id} />
          {isSubstituteRecord ? (
            <input name="isSubstitute" type="hidden" value="1" />
          ) : null}
          {lessonRecord ? (
            <input name="lessonId" type="hidden" value={lessonRecord.id} />
          ) : null}

          <section className="panel record-settings" aria-label={t("label.lesson")}>
            <label>
              <span>{t("label.lessonName")}</span>
              <input
                defaultValue={lessonRecord?.name ?? ""}
                name="lessonName"
                placeholder={t("text.lessonNamePlaceholder")}
                required
                type="text"
              />
            </label>
            <label>
              <span>{t("label.lessonDate")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                className="date-input"
                dateFormat={currentUser.dateFormat}
                defaultValue={
                  lessonRecord
                    ? formatShortDateInput(lessonRecord.lessonDate, "YYYY_MM_DD")
                    : todayInputValue()
                }
                name="lessonDate"
                required
              />
            </label>
            <label>
              <span>{t("label.notes")}</span>
              <textarea
                defaultValue={lessonRecord?.notes ?? ""}
                name="notes"
                placeholder={t("text.lessonNotesPlaceholder")}
                rows={3}
              />
            </label>
            {isSubstituteRecord || isPendingSubstitution ? (
              <label>
                <span>{t("label.substitutionNotes")}</span>
                <textarea
                  defaultValue={lessonRecord?.substitutionNotes ?? ""}
                  name="substitutionNotes"
                  placeholder={t("text.adminReviewNotePlaceholder")}
                  rows={3}
                />
              </label>
            ) : null}
          </section>

          <section className="panel data-panel" aria-labelledby="students-title">
            <h2 id="students-title">{t("label.students")}</h2>
            <div className="record-list">
              {schoolClass.enrollments.map((enrollment) => {
                const attendanceStatus = findStudentStatus(
                  lessonRecord?.attendanceRecords ?? [],
                  enrollment.student.id,
                  "ABSENT",
                );
                const homeworkStatus = findStudentStatus(
                  lessonRecord?.homeworkRecords ?? [],
                  enrollment.student.id,
                  "INCOMPLETE",
                );

                return (
                  <article className="student-record-row" key={enrollment.id}>
                    <div>
                      <strong>{enrollment.student.fullName}</strong>
                    </div>

                    <label className="record-checkbox-label">
                      <input
                        defaultChecked={attendanceStatus === "PRESENT"}
                        name={`attendance:${enrollment.student.id}`}
                        type="checkbox"
                        value="PRESENT"
                      />
                      <span>{t("option.attendancePresent")}</span>
                    </label>

                    <label className="record-checkbox-label">
                      <input
                        defaultChecked={homeworkStatus === "COMPLETED"}
                        name={`homework:${enrollment.student.id}`}
                        type="checkbox"
                        value="COMPLETED"
                      />
                      <span>{t("option.homeworkDone")}</span>
                    </label>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="record-actions">
            {isEditingSubmitted || isSubstituteRecord ? null : (
              <button
                className="secondary-button"
                formAction={saveDraftClassRecordAction}
                type="submit"
              >
                {t("label.saveDraft")}
              </button>
            )}
            <button className="primary-button" type="submit">
              {isEditingSubmitted
                ? t("label.updateSubmission")
                : isSubstituteRecord
                  ? t("label.submitSubstituteRecord")
                  : t("label.submitClassRecord")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
