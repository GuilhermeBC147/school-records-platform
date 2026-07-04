import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewSubstitutionPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const classes = await prisma.class.findMany({
    where: {
      isActive: true,
      teacherId: {
        not: currentUser.id,
      },
    },
    orderBy: [{ teacher: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      book: true,
      durationMinutes: true,
      semester: true,
      weekDays: true,
      year: true,
      teacher: {
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
        <section className="intro" aria-labelledby="substitution-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Teacher work</p>
          <h1 id="substitution-title">Substitute lesson</h1>
          <p className="lede">
            Choose the class you are covering, then record attendance and
            homework while the details are fresh.
          </p>
        </section>

        <section className="class-grid" aria-label="Classes available for substitution">
          {classes.map((schoolClass) => (
            <article className="panel class-card" key={schoolClass.id}>
              <div>
                <p className="eyebrow">
                  {schoolClass.book ?? "Class"}
                  {schoolClass.semester && schoolClass.year
                    ? ` | Semester ${schoolClass.semester}/${schoolClass.year}`
                    : ""}
                </p>
                <h2>{schoolClass.name}</h2>
                <p>Primary teacher: {schoolClass.teacher.name}</p>
                <p>
                  {formatWeekdays(schoolClass.weekDays)} |{" "}
                  {formatDuration(schoolClass.durationMinutes)}
                </p>
              </div>
              <Link
                className="primary-link"
                href={`/dashboard/classes/${schoolClass.id}/record?substitute=1`}
              >
                Record substitute lesson
              </Link>
            </article>
          ))}
          {classes.length === 0 ? (
            <article className="panel data-panel">
              <h2>No classes available</h2>
              <p className="muted-copy">
                Other teachers' active classes will appear here when they are
                available for substitute records.
              </p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
