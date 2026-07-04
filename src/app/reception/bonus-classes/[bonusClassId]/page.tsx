import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateBonusClassAction } from "@/app/actions/bonus-classes";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type EditBonusClassPageProps = {
  params: Promise<{
    bonusClassId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function dateInputValue(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${year}-${month}-${day}`;
}

export default async function EditBonusClassPage({
  params,
  searchParams,
}: EditBonusClassPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION") {
    redirect("/dashboard");
  }

  const { bonusClassId } = await params;
  const query = await searchParams;
  const [bonusClass, students, teachers] = await Promise.all([
    prisma.bonusClass.findFirst({
      where: {
        id: bonusClassId,
        status: "SCHEDULED",
      },
      select: {
        id: true,
        durationMinutes: true,
        notes: true,
        scheduledDate: true,
        startTime: true,
        studentId: true,
        subject: true,
        teacherId: true,
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

  if (!bonusClass) {
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
        <section className="intro" aria-labelledby="edit-bonus-title">
          <Link className="text-link" href="/reception/bonus-classes">
            Back to bonus classes
          </Link>
          <p className="eyebrow">Reception</p>
          <h1 id="edit-bonus-title">Edit bonus class</h1>
          <p className="lede">
            Update the student, subject, teacher, or schedule before the class
            happens.
          </p>
        </section>

        {query.error === "overlap" ? (
          <p className="form-error">
            This teacher already has a bonus class during that time.
          </p>
        ) : null}
        {query.error === "invalid" ? (
          <p className="form-error">Check the bonus class details and try again.</p>
        ) : null}

        <section className="panel data-panel" aria-label="Bonus class form">
          <form action={updateBonusClassAction} className="admin-form">
            <input name="bonusClassId" type="hidden" value={bonusClass.id} />
            <label>
              <span>Student</span>
              <select defaultValue={bonusClass.studentId} name="studentId" required>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Subject</span>
              <input defaultValue={bonusClass.subject} name="subject" required type="text" />
            </label>
            <label>
              <span>Teacher</span>
              <select defaultValue={bonusClass.teacherId} name="teacherId" required>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input
                defaultValue={dateInputValue(bonusClass.scheduledDate)}
                name="scheduledDate"
                required
                type="date"
              />
            </label>
            <label>
              <span>Start time</span>
              <input
                defaultValue={bonusClass.startTime}
                name="startTime"
                required
                type="time"
              />
            </label>
            <label>
              <span>Duration minutes</span>
              <input
                defaultValue={bonusClass.durationMinutes}
                min="1"
                max="720"
                name="durationMinutes"
                required
                type="number"
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea defaultValue={bonusClass.notes ?? ""} name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                Save bonus class
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
