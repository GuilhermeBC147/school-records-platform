import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReceptionDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
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
        <section className="intro" aria-labelledby="reception-title">
          <p className="eyebrow">Reception dashboard</p>
          <h1 id="reception-title">Reception</h1>
          <p className="lede">
            Schedule bonus classes, scan teacher availability, and answer
            parent-facing student or class questions.
          </p>
          <div className="action-row">
            {currentUser.role === "ADMIN" ? (
              <Link className="secondary-link" href="/dashboard">
                Back to dashboard
              </Link>
            ) : null}
            <Link className="primary-link" href="/reception/bonus-classes">
              Schedule bonus class
            </Link>
            <Link className="primary-link" href="/reception/calendar">
              Bonus calendar
            </Link>
            <Link className="primary-link" href="/reception/students-and-classes">
              Student and class search
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
