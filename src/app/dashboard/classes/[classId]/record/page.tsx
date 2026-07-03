import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { submitClassRecordAction } from "@/app/actions/class-records";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ClassRecordPageProps = {
  params: Promise<{
    classId: string;
  }>;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ClassRecordPage({ params }: ClassRecordPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { classId } = await params;

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
        <section className="intro" aria-labelledby="record-title">
          <Link className="text-link" href={`/dashboard/classes/${schoolClass.id}`}>
            Back to class
          </Link>
          <p className="eyebrow">{schoolClass.level ?? "No level"}</p>
          <h1 id="record-title">New class record</h1>
          <p className="lede">
            {schoolClass.name} with {schoolClass.teacher.name}
          </p>
        </section>

        <form action={submitClassRecordAction} className="record-form">
          <input name="classId" type="hidden" value={schoolClass.id} />

          <section className="panel record-settings" aria-label="Lesson details">
            <label>
              <span>Lesson date</span>
              <input defaultValue={todayInputValue()} name="lessonDate" required type="date" />
            </label>
            <label>
              <span>Notes</span>
              <textarea
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
                      defaultValue="PRESENT"
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
                      defaultValue="NOT_ASSIGNED"
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
            <button className="primary-button" type="submit">
              Submit class record
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
