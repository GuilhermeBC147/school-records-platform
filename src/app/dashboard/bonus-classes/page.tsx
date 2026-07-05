import Link from "next/link";
import { redirect } from "next/navigation";
import { completeBonusClassAction } from "@/app/actions/bonus-classes";
import { logoutAction } from "@/app/actions/auth";
import { DateInput } from "@/app/components/date-input";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import {
  formatBonusClassResultMessage,
  formatBonusClassStatus,
  formatStartTime,
} from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type TeacherBonusClassesPageProps = {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }>;
};

function readDateFilter(value: string | undefined, boundary: "start" | "end") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (boundary === "end") {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

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
  const defaultRange = getDefaultDateRange();
  const dateFrom = query.dateFrom ?? defaultRange.dateFrom;
  const dateTo = query.dateTo ?? defaultRange.dateTo;
  const dateStart = readDateFilter(dateFrom, "start");
  const dateEnd = readDateFilter(dateTo, "end");
  const successMessage = formatBonusClassResultMessage(query.status);
  const bonusClasses = await prisma.bonusClass.findMany({
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    where: {
      teacherId: currentUser.id,
      ...(dateStart || dateEnd
        ? {
            scheduledDate: {
              ...(dateStart ? { gte: dateStart } : {}),
              ...(dateEnd ? { lt: dateEnd } : {}),
            },
          }
        : {}),
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
  const bonusClassesByDate = new Map<string, typeof bonusClasses>();

  for (const bonusClass of bonusClasses) {
    const key = dateKey(bonusClass.scheduledDate);
    bonusClassesByDate.set(key, [
      ...(bonusClassesByDate.get(key) ?? []),
      bonusClass,
    ]);
  }

  const calendarDates = Array.from(bonusClassesByDate.keys()).sort();

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

        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <section className="panel" aria-label="Bonus class filters">
          <form className="filter-form compact-filter-form">
            <label>
              <span>From</span>
              <DateInput
                dateFormat={currentUser.dateFormat}
                defaultValue={dateFrom}
                name="dateFrom"
              />
            </label>
            <label>
              <span>To</span>
              <DateInput
                dateFormat={currentUser.dateFormat}
                defaultValue={dateTo}
                name="dateTo"
              />
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply
              </button>
              <Link className="text-link" href="/dashboard/bonus-classes">
                Current month
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="assigned-bonus-title">
          <h2 id="assigned-bonus-title">Assigned bonus classes</h2>
          <div className="bonus-calendar">
            {calendarDates.map((key) => {
              const dayClasses = bonusClassesByDate.get(key) ?? [];

              return (
                <article className="bonus-calendar-day" key={key}>
                  <h3>
                    {formatShortDate(
                      dayClasses[0].scheduledDate,
                      currentUser.dateFormat,
                    )}
                  </h3>
                  <div className="bonus-calendar-events">
                    {dayClasses.map((bonusClass) => (
                      <div className="bonus-calendar-event" key={bonusClass.id}>
                        <div>
                          <strong>
                            {formatStartTime(bonusClass.startTime)} |{" "}
                            {bonusClass.student.fullName}
                          </strong>
                          <span>
                            {bonusClass.subject} |{" "}
                            {formatDuration(bonusClass.durationMinutes)}
                          </span>
                          <span>
                            {formatBonusClassStatus(bonusClass.status)} |{" "}
                            {formatBonusClassStatus(bonusClass.attendanceStatus)}
                          </span>
                        </div>
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
                              value={`/dashboard/bonus-classes?dateFrom=${dateFrom}&dateTo=${dateTo}&status=completed`}
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
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
            {bonusClasses.length === 0 ? (
              <p className="muted-copy">No bonus classes assigned for this date range.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
