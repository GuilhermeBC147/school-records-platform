import Link from "next/link";
import { redirect } from "next/navigation";
import {
  cancelBonusClassAction,
  createBonusClassAction,
} from "@/app/actions/bonus-classes";
import { logoutAction } from "@/app/actions/auth";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import {
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

  if (currentUser.role !== "RECEPTION") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const [bonusClasses, students, teachers] = await Promise.all([
    prisma.bonusClass.findMany({
      orderBy: [{ scheduledDate: "desc" }, { startTime: "asc" }],
      take: 50,
      select: {
        id: true,
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
          <p className="eyebrow">Reception</p>
          <h1 id="bonus-title">Bonus classes</h1>
          <p className="lede">
            Schedule independent bonus classes and assign them to active
            teachers.
          </p>
        </section>

        {query.status ? (
          <p className="form-success">Bonus class {query.status}.</p>
        ) : null}
        {query.error === "overlap" ? (
          <p className="form-error">
            This teacher already has a bonus class during that time.
          </p>
        ) : null}
        {query.error === "invalid" ? (
          <p className="form-error">Check the bonus class details and try again.</p>
        ) : null}

        <section className="panel data-panel" aria-labelledby="new-bonus-title">
          <h2 id="new-bonus-title">Schedule bonus class</h2>
          <form action={createBonusClassAction} className="admin-form">
            <label>
              <span>Student</span>
              <select name="studentId" required>
                <option value="">Choose a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
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
              <input name="scheduledDate" required type="date" />
            </label>
            <label>
              <span>Start time</span>
              <input name="startTime" required type="time" />
            </label>
            <label>
              <span>Duration minutes</span>
              <input min="1" max="720" name="durationMinutes" required type="number" />
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bonusClasses.map((bonusClass) => (
                  <tr key={bonusClass.id}>
                    <td>{formatShortDate(bonusClass.scheduledDate)}</td>
                    <td>{formatStartTime(bonusClass.startTime)}</td>
                    <td>{bonusClass.student.fullName}</td>
                    <td>{bonusClass.subject}</td>
                    <td>{bonusClass.teacher.name}</td>
                    <td>{formatDuration(bonusClass.durationMinutes)}</td>
                    <td>{formatBonusClassStatus(bonusClass.status)}</td>
                    <td>
                      <div className="table-actions">
                        {bonusClass.status === "SCHEDULED" ? (
                          <>
                            <Link
                              className="text-link"
                              href={`/reception/bonus-classes/${bonusClass.id}`}
                            >
                              Edit
                            </Link>
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
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {bonusClasses.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No bonus classes scheduled yet.</td>
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
