import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminClassesPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function formatTerm(semester: number | null, year: number | null) {
  if (!semester || !year) {
    return "-";
  }

  return `Semester ${semester}/${year}`;
}

export default async function AdminClassesPage({
  searchParams,
}: AdminClassesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const classes = await prisma.class.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      book: true,
      semester: true,
      year: true,
      durationMinutes: true,
      weekDays: true,
      isActive: true,
      teacher: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          lessons: true,
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
        <section className="intro" aria-labelledby="classes-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="classes-title">Classes</h1>
          <p className="lede">
            Create classes, assign teachers, and control which classes are
            active for teacher dashboards.
          </p>
          <div className="action-row">
            <Link className="primary-link" href="/admin/classes/new">
              Create class
            </Link>
          </div>
        </section>

        {params.status ? (
          <p className="form-success">
            Class {params.status === "created" ? "created" : "updated"}.
          </p>
        ) : null}

        <section className="panel data-panel" aria-label="Classes">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Book</th>
                  <th>Term</th>
                  <th>Schedule</th>
                  <th>Duration</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Students</th>
                  <th>Lessons</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((schoolClass) => (
                  <tr key={schoolClass.id}>
                    <td>{schoolClass.name}</td>
                    <td>{schoolClass.book ?? "-"}</td>
                    <td>{formatTerm(schoolClass.semester, schoolClass.year)}</td>
                    <td>{formatWeekdays(schoolClass.weekDays)}</td>
                    <td>{formatDuration(schoolClass.durationMinutes)}</td>
                    <td>{schoolClass.teacher.name}</td>
                    <td>{schoolClass.isActive ? "Active" : "Inactive"}</td>
                    <td>{schoolClass._count.enrollments}</td>
                    <td>{schoolClass._count.lessons}</td>
                    <td>
                      <Link
                        className="text-link compact-link"
                        href={`/admin/classes/${schoolClass.id}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
