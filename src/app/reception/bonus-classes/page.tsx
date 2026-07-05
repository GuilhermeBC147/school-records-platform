import Link from "next/link";
import { redirect } from "next/navigation";
import {
  cancelBonusClassAction,
  createBonusClassAction,
} from "@/app/actions/bonus-classes";
import { logoutAction } from "@/app/actions/auth";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import {
  formatBonusClassErrorMessage,
  formatBonusClassResultMessage,
  formatBonusClassStatus,
  formatStartTime,
} from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ReceptionBonusClassesPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function ReceptionBonusClassesPage({
  searchParams,
}: ReceptionBonusClassesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const errorMessage = formatBonusClassErrorMessage(query.error);
  const successMessage = formatBonusClassResultMessage(query.status);
  const [bonusClasses, students, teachers] = await Promise.all([
    prisma.bonusClass.findMany({
      orderBy: [{ scheduledDate: "desc" }, { startTime: "asc" }],
      take: 50,
      select: {
        id: true,
        attendanceStatus: true,
        durationMinutes: true,
        notes: true,
        scheduledDate: true,
        startTime: true,
        status: true,
        subject: true,
        student: {
          select: { fullName: true },
        },
        teacher: {
          select: { name: true },
        },
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: {
        isActive: true,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

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
        <section className="intro" aria-labelledby="bonus-title">
          <Link className="text-link" href="/reception">
            Back to reception
          </Link>
          <p className="eyebrow">Reception</p>
          <h1 id="bonus-title">Schedule bonus class</h1>
          <p className="lede">
            Create an independent bonus class with student, subject, teacher,
            date, time, duration, and notes.
          </p>
          <div className="action-row">
            {currentUser.role === "ADMIN" ? (
              <Link className="secondary-link" href="/dashboard">
                Back to dashboard
              </Link>
            ) : null}
            <Link className="primary-link" href="/reception/calendar">
              View calendar
            </Link>
          </div>
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <section className="panel data-panel" aria-labelledby="new-bonus-title">
          <h2 id="new-bonus-title">Bonus class details</h2>
          <form action={createBonusClassAction} className="admin-form">
            <label>
              <span>Student search</span>
              <input
                autoComplete="off"
                list="bonus-students"
                name="studentSearch"
                placeholder="Type a student name"
                required
                type="search"
              />
              <datalist id="bonus-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <label>
              <span>Subject</span>
              <input name="subject" required type="text" />
            </label>
            <label>
              <span>Teacher</span>
              <select name="teacherId" required>
                <option value="">Choose a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <DateInput
                dateFormat={currentUser.dateFormat}
                name="scheduledDate"
                required
              />
            </label>
            <label>
              <span>Start time</span>
              <TimeInput name="startTime" required />
            </label>
            <label>
              <span>Duration</span>
              <DurationInput name="durationMinutes" required />
            </label>
            <label>
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                Schedule bonus class
              </button>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="scheduled-title">
          <h2 id="scheduled-title">Recent bonus classes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bonusClasses.map((bonusClass) => (
                  <tr key={bonusClass.id}>
                    <td>
                      {formatShortDate(
                        bonusClass.scheduledDate,
                        currentUser.dateFormat,
                      )}
                    </td>
                    <td>{formatStartTime(bonusClass.startTime)}</td>
                    <td>{bonusClass.student.fullName}</td>
                    <td>{bonusClass.subject}</td>
                    <td>{bonusClass.teacher.name}</td>
                    <td>{formatDuration(bonusClass.durationMinutes)}</td>
                    <td>{formatBonusClassStatus(bonusClass.status)}</td>
                    <td>{formatBonusClassStatus(bonusClass.attendanceStatus)}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="text-link"
                          href={`/reception/bonus-classes/${bonusClass.id}`}
                        >
                          Open
                        </Link>
                        {bonusClass.status === "SCHEDULED" ? (
                          <form action={cancelBonusClassAction}>
                            <input
                              name="bonusClassId"
                              type="hidden"
                              value={bonusClass.id}
                            />
                            <button className="secondary-button" type="submit">
                              Cancel
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {bonusClasses.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No bonus classes scheduled yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
