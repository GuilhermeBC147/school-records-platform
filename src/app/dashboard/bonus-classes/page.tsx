import Link from "next/link";
import { redirect } from "next/navigation";
import { completeBonusClassAction } from "@/app/actions/bonus-classes";
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

type TeacherBonusClassesPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function TeacherBonusClassesPage({
  searchParams,
}: TeacherBonusClassesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const bonusClasses = await prisma.bonusClass.findMany({
    orderBy: [{ scheduledDate: "desc" }, { startTime: "asc" }],
    where: {
      teacherId: currentUser.id,
    },
    select: {
      attendanceStatus: true,
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
        <section className="intro" aria-labelledby="teacher-bonus-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Teacher work</p>
          <h1 id="teacher-bonus-title">Bonus classes</h1>
          <p className="lede">
            Confirm assigned bonus classes after they happen so they count in
            your monthly summary.
          </p>
        </section>

        {query.status === "completed" ? (
          <p className="form-success">Bonus class completed.</p>
        ) : null}

        <section className="panel data-panel" aria-labelledby="assigned-bonus-title">
          <h2 id="assigned-bonus-title">Assigned bonus classes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bonusClasses.map((bonusClass) => (
                  <tr key={bonusClass.id}>
                    <td>{formatShortDate(bonusClass.scheduledDate)}</td>
                    <td>{formatStartTime(bonusClass.startTime)}</td>
                    <td>{bonusClass.student.fullName}</td>
                    <td>{bonusClass.subject}</td>
                    <td>{formatDuration(bonusClass.durationMinutes)}</td>
                    <td>{formatBonusClassStatus(bonusClass.status)}</td>
                    <td>{formatBonusClassStatus(bonusClass.attendanceStatus)}</td>
                    <td>
                      {bonusClass.status !== "CANCELED" ? (
                        <form action={completeBonusClassAction}>
                          <input
                            name="bonusClassId"
                            type="hidden"
                            value={bonusClass.id}
                          />
                          <input
                            name="redirectTo"
                            type="hidden"
                            value="/dashboard/bonus-classes?status=completed"
                          />
                          <select
                            defaultValue={
                              bonusClass.attendanceStatus === "PENDING"
                                ? "PRESENT"
                                : bonusClass.attendanceStatus
                            }
                            name="attendanceStatus"
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="EXCUSED">Excused</option>
                          </select>
                          <button className="primary-button" type="submit">
                            Confirm
                          </button>
                        </form>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {bonusClasses.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No bonus classes assigned.</td>
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
