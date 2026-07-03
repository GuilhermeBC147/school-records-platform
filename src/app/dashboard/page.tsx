import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const classes = await prisma.class.findMany({
    where:
      currentUser.role === "TEACHER"
        ? {
            teacherId: currentUser.id,
            isActive: true,
          }
        : {
            isActive: true,
          },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      level: true,
      teacher: {
        select: { name: true },
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
        <section className="intro" aria-labelledby="dashboard-title">
          <p className="eyebrow">{currentUser.role.toLowerCase()} dashboard</p>
          <h1 id="dashboard-title">Your classes</h1>
          <p className="lede">
            This is the first protected page. It already uses your login session
            to decide which classes you can see.
          </p>
        </section>

        <section className="class-grid" aria-label="Assigned classes">
          {classes.map((schoolClass) => (
            <article className="panel class-card" key={schoolClass.id}>
              <div>
                <p className="eyebrow">{schoolClass.level ?? "No level"}</p>
                <h2>{schoolClass.name}</h2>
                <p>{schoolClass.teacher.name}</p>
              </div>
              <dl>
                <div>
                  <dt>Students</dt>
                  <dd>{schoolClass._count.enrollments}</dd>
                </div>
                <div>
                  <dt>Lessons</dt>
                  <dd>{schoolClass._count.lessons}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
