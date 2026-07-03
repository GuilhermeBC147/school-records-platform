import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  saveDraftClassRecordAction,
  submitClassRecordAction,
} from "@/app/actions/class-records";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDateInput, formatShortTimeInput } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ClassRecordPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    lessonId?: string;
  }>;
};

function todayInputValue() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

function currentTimeInputValue() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
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
  const { lessonId } = await searchParams;

  const schoolClass = await prisma.class.findFirst({
    where: {
      id: classId,
      isActive: true,
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    select: {
      id: true,
      name: true,
      level: true,
      teacher: {
        select: { name: true },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        orderBy: {
          student: { fullName: "asc" },
        },
        select: {
          id: true,
          student: {
            select: {
              id: true,
              fullName: true,
              preferredName: true,
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
          lessonDate: true,
          notes: true,
          status: true,
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
          <p className="eyebrow">{schoolClass.level ?? "No level"}</p>
          <h1 id="record-title">
            {isEditingSubmitted ? "Edit class record" : "Class record"}
          </h1>
          <p className="lede">
            {schoolClass.name} with {schoolClass.teacher.name}
          </p>
        </section>

        <form action={submitClassRecordAction} className="record-form">
          <input name="classId" type="hidden" value={schoolClass.id} />
          {lessonRecord ? (
            <input name="lessonId" type="hidden" value={lessonRecord.id} />
          ) : null}

          <section className="panel record-settings" aria-label="Lesson details">
            <label>
              <span>Lesson date</span>
              <input
                className="date-input"
                defaultValue={
                  lessonRecord
                    ? formatShortDateInput(lessonRecord.lessonDate)
                    : todayInputValue()
                }
                inputMode="numeric"
                name="lessonDate"
                pattern="[0-9]{2}/[0-9]{2}/[0-9]{2,4}"
                placeholder="DD/MM/YY"
                required
                type="text"
              />
            </label>
            <label>
              <span>Lesson time</span>
              <input
                className="date-input"
                defaultValue={
                  lessonRecord
                    ? formatShortTimeInput(lessonRecord.lessonDate)
                    : currentTimeInputValue()
                }
                name="lessonTime"
                required
                type="time"
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
          </section>

          <section className="panel data-panel" aria-labelledby="students-title">
            <h2 id="students-title">Students</h2>
            <div className="record-list">
              {schoolClass.enrollments.map((enrollment) => (
                <article className="student-record-row" key={enrollment.id}>
                  <div>
                    <strong>{enrollment.student.fullName}</strong>
                    <span>{enrollment.student.preferredName ?? "No preferred name"}</span>
                  </div>

                  <label>
                    <span>Attendance</span>
                    <select
                      defaultValue={findStudentStatus(
                        lessonRecord?.attendanceRecords ?? [],
                        enrollment.student.id,
                        "PRESENT",
                      )}
                      name={`attendance:${enrollment.student.id}`}
                    >
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
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
                        "NOT_ASSIGNED",
                      )}
                      name={`homework:${enrollment.student.id}`}
                    >
                      <option value="COMPLETED">Completed</option>
                      <option value="INCOMPLETE">Incomplete</option>
                      <option value="NOT_ASSIGNED">Not assigned</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>

          <div className="record-actions">
            {isEditingSubmitted ? null : (
              <button
                className="secondary-button"
                formAction={saveDraftClassRecordAction}
                type="submit"
              >
                Save draft
              </button>
            )}
            <button className="primary-button" type="submit">
              {isEditingSubmitted ? "Update submission" : "Submit class record"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
