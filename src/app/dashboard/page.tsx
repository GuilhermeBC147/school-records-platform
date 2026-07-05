import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Weekday } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    day?: string;
  }>;
};

function getCurrentWeekday() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
    .format(new Date())
    .toUpperCase();

  return weekdayOptions.some((option) => option.value === weekday)
    ? (weekday as Weekday)
    : undefined;
}

function readWeekday(value: string | undefined) {
  if (weekdayOptions.some((option) => option.value === value)) {
    return value as Weekday;
  }

  return undefined;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "RECEPTION") {
    redirect("/reception");
  }

  const params = await searchParams;
  const selectedDay =
    currentUser.role === "TEACHER"
      ? params.day === "all"
        ? undefined
        : readWeekday(params.day) ?? getCurrentWeekday()
      : undefined;
  const dashboardTitle =
    currentUser.role === "ADMIN" ? "Admin dashboard" : currentUser.name;
  const dashboardLede =
    currentUser.role === "ADMIN"
      ? "Manage school records, staff accounts, reception tools, risk review, and teacher work summaries from one place."
      : "Open class records, review assigned bonus classes, and manage your monthly work summary.";

  const classes =
    currentUser.role === "TEACHER"
      ? await prisma.class.findMany({
          where: {
            teacherId: currentUser.id,
            isActive: true,
            ...(selectedDay ? { weekDays: { has: selectedDay } } : {}),
          },
          orderBy: { name: "asc" },
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
              select: { name: true },
            },
            _count: {
              select: {
                enrollments: true,
                lessons: true,
              },
            },
          },
        })
      : [];
  const allClassesHref = "/dashboard?day=all";
  const dayFilterValue = params.day === "all" ? "all" : selectedDay ?? "";
  const visibleClassesLabel =
    dayFilterValue === "all"
      ? "All classes"
      : weekdayOptions.find((option) => option.value === selectedDay)?.label ??
        "Today";

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
          <h1 id="dashboard-title">{dashboardTitle}</h1>
          <p className="lede">{dashboardLede}</p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="primary-link" href="/admin/manage-accounts">
                Manage accounts
              </Link>
              <Link className="primary-link" href="/admin/classes">
                Manage classes
              </Link>
              <Link className="primary-link" href="/admin/students">
                Manage students
              </Link>
              <Link className="primary-link" href="/admin/risk">
                Review student risk
              </Link>
              <Link className="primary-link" href="/admin/work-summary">
                Teacher work summaries
              </Link>
              <Link className="primary-link" href="/admin/substitutions">
                Review substitutions
              </Link>
              <Link className="primary-link" href="/reception">
                Reception tools
              </Link>
              <Link className="primary-link" href="/dashboard/account">
                Account settings
              </Link>
            </div>
          ) : (
            <div className="action-row">
              <Link className="primary-link" href="/dashboard/work">
                Monthly summary
              </Link>
              <Link className="primary-link" href="/dashboard/work/new">
                Add event
              </Link>
              <Link className="primary-link" href="/dashboard/bonus-classes">
                Bonus classes
              </Link>
              <Link className="primary-link" href="/dashboard/substitutions/new">
                Substitute lesson
              </Link>
              <Link className="primary-link" href="/dashboard/account">
                Account settings
              </Link>
            </div>
          )}
        </section>

        {currentUser.role === "TEACHER" ? (
          <>
            <section className="panel" aria-label="Class filters">
              <form className="filter-form compact-filter-form">
                <label>
                  <span>Day</span>
                  <select defaultValue={dayFilterValue} name="day">
                    <option value="all">All days</option>
                    {weekdayOptions.map((weekday) => (
                      <option key={weekday.value} value={weekday.value}>
                        {weekday.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filter-actions">
                  <button className="primary-button" type="submit">
                    Apply
                  </button>
                  <Link className="text-link" href={allClassesHref}>
                    Show all
                  </Link>
                </div>
              </form>
            </section>

            <section className="class-grid" aria-label={visibleClassesLabel}>
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
                    <p>
                      {formatWeekdays(schoolClass.weekDays)} |{" "}
                      {formatDuration(schoolClass.durationMinutes)}
                    </p>
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
                  <Link
                    className="text-link"
                    href={`/dashboard/classes/${schoolClass.id}`}
                  >
                    Open class
                  </Link>
                </article>
              ))}
              {classes.length === 0 ? (
                <article className="panel class-card">
                  <h2>No classes for {visibleClassesLabel.toLowerCase()}</h2>
                  <Link className="text-link" href={allClassesHref}>
                    Show all classes
                  </Link>
                </article>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
