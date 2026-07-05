import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  saveDraftClassRecordAction,
  submitClassRecordAction,
} from "@/app/actions/class-records";
import { logoutAction } from "@/app/actions/auth";
import { DateInput } from "@/app/components/date-input";
import { formatShortDateInput } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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

  const { classId } = await params;
  const { lessonId, substitute } = await searchParams;
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
        <section className="intro" aria-labelledby="record-title">
          <Link className="text-link" href={`/dashboard/classes/${schoolClass.id}`}>
            Back to class
          </Link>
          <p className="eyebrow">
            {schoolClass.book ?? "Class"}
            {schoolClass.semester && schoolClass.year
              ? ` | Semester ${schoolClass.semester}/${schoolClass.year}`
              : ""}
          </p>
          <h1 id="record-title">
            {isSubstituteRecord
              ? "Substitute class record"
              : isEditingSubmitted
                ? "Edit class record"
                : "Class record"}
          </h1>
          <p className="lede">
            {schoolClass.name} with {schoolClass.teacher.name}
          </p>
          {isSubstituteRecord || isPendingSubstitution ? (
            <p className="muted-copy">
              This record will be saved for attendance and homework immediately.
              Admin approval decides whether the substitute hours count toward
              payroll.
            </p>
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

          <section className="panel record-settings" aria-label="Lesson details">
            <label>
              <span>Lesson name</span>
              <input
                defaultValue={lessonRecord?.name ?? ""}
                name="lessonName"
                placeholder="Conversation practice"
                required
                type="text"
              />
            </label>
            <label>
              <span>Lesson date</span>
              <DateInput
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
              <span>Notes</span>
              <textarea
                defaultValue={lessonRecord?.notes ?? ""}
                name="notes"
                placeholder="Optional notes about this lesson"
                rows={3}
              />
            </label>
            {isSubstituteRecord || isPendingSubstitution ? (
              <label>
                <span>Substitution notes</span>
                <textarea
                  defaultValue={lessonRecord?.substitutionNotes ?? ""}
                  name="substitutionNotes"
                  placeholder="Optional note for admin review"
                  rows={3}
                />
              </label>
            ) : null}
          </section>

          <section className="panel data-panel" aria-labelledby="students-title">
            <h2 id="students-title">Students</h2>
            <div className="record-list">
              {schoolClass.enrollments.map((enrollment) => (
                <article className="student-record-row" key={enrollment.id}>
                  <div>
                    <strong>{enrollment.student.fullName}</strong>
                  </div>

                  <label>
                    <span>Attendance</span>
                    <select
                      defaultValue={findStudentStatus(
                        lessonRecord?.attendanceRecords ?? [],
                        enrollment.student.id,
                        "ABSENT",
                      )}
                      name={`attendance:${enrollment.student.id}`}
                    >
                      <option hidden value="ABSENT">
                        Absent
                      </option>
                      <option value="PRESENT">Present</option>
                      <option value="LATE">Late</option>
                      <option value="EXCUSED">Excused</option>
                    </select>
                  </label>

                  <label>
                    <span>Homework</span>
                    <select
                      defaultValue={findStudentStatus(
                        lessonRecord?.homeworkRecords ?? [],
                        enrollment.student.id,
                        "INCOMPLETE",
                      )}
                      name={`homework:${enrollment.student.id}`}
                    >
                      <option value="COMPLETED">Complete</option>
                      <option value="INCOMPLETE">Not done</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>

          <div className="record-actions">
            {isEditingSubmitted || isSubstituteRecord ? null : (
              <button
                className="secondary-button"
                formAction={saveDraftClassRecordAction}
                type="submit"
              >
                Save draft
              </button>
            )}
            <button className="primary-button" type="submit">
              {isEditingSubmitted
                ? "Update submission"
                : isSubstituteRecord
                  ? "Submit substitute record"
                  : "Submit class record"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
