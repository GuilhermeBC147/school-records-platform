import Link from "next/link";
import { redirect } from "next/navigation";
import { DateInput } from "@/app/components/date-input";
import { formatDuration } from "@/lib/class-schedule";
import {
  formatBonusClassStatus,
  formatStartTime,
  formatTimeFromMinutes,
  readIsoDate,
  readTimeMinutes,
} from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type ReceptionCalendarPageProps = {
  searchParams: Promise<{
    date?: string;
    teacherId?: string;
  }>;
};

function todayDateInputValue() {
  const date = new Date();
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${year}-${month}-${day}`;
}

function safeCalendarDate(value: string | undefined) {
  const fallback = todayDateInputValue();

  try {
    const label = value ?? fallback;

    return {
      date: readIsoDate(label),
      label,
    };
  } catch {
    return {
      date: readIsoDate(fallback),
      label: fallback,
    };
  }
}

function bonusClassStartsInSlot(
  bonusClass: { startTime: string },
  slotStartMinutes: number,
) {
  const startMinutes = readTimeMinutes(bonusClass.startTime);

  return startMinutes >= slotStartMinutes && startMinutes < slotStartMinutes + 30;
}

export default async function ReceptionCalendarPage({
  searchParams,
}: ReceptionCalendarPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const calendarDate = safeCalendarDate(query.date);
  const selectedTeacherId = query.teacherId?.trim() || undefined;
  const teachers = await prisma.user.findMany({
    orderBy: { name: "asc" },
    where: {
      isActive: true,
      role: "TEACHER",
      ...(selectedTeacherId ? { id: selectedTeacherId } : {}),
    },
    select: {
      id: true,
      name: true,
    },
  });
  const allTeachers =
    selectedTeacherId
      ? await prisma.user.findMany({
          orderBy: { name: "asc" },
          where: { isActive: true, role: "TEACHER" },
          select: { id: true, name: true },
        })
      : teachers;
  const calendarBonusClasses = await prisma.bonusClass.findMany({
    orderBy: [{ startTime: "asc" }, { teacher: { name: "asc" } }],
    where: {
      scheduledDate: calendarDate.date,
      status: {
        not: "CANCELED",
      },
      ...(selectedTeacherId ? { teacherId: selectedTeacherId } : {}),
    },
    select: {
      id: true,
      attendanceStatus: true,
      durationMinutes: true,
      startTime: true,
      status: true,
      subject: true,
      student: {
        select: { fullName: true },
      },
      teacherId: true,
    },
  });
  const timeSlots = Array.from({ length: 31 }, (_, index) => 7 * 60 + index * 30);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="calendar-title">
          <Link className="text-link" href="/reception">
            {t("label.backToReception")}
          </Link>
          <p className="eyebrow">{t("dashboard.reception")}</p>
          <h1 id="calendar-title">{t("dashboard.calendar")}</h1>
          <p className="lede">{t("dashboard.teacherAvailabilityCopy")}</p>
          <div className="action-row">
            {currentUser.role === "ADMIN" ? (
              <Link className="secondary-link" href="/dashboard">
                {t("label.backToDashboard")}
              </Link>
            ) : null}
            <Link className="primary-link" href="/reception/bonus-classes">
              {t("label.scheduleBonusClass")}
            </Link>
          </div>
        </section>

        <section className="panel" aria-label={t("label.calendarFilters")}>
          <form className="filter-form compact-filter-form">
            <label>
              <span>{t("label.date")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                defaultValue={calendarDate.label}
                name="date"
                required
              />
            </label>
            <label>
              <span>{t("label.teacher")}</span>
              <select defaultValue={selectedTeacherId ?? ""} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {allTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.view")}
              </button>
              <Link className="text-link" href="/reception/calendar">
                {t("dashboard.today")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="daily-calendar-title">
          <h2 id="daily-calendar-title">{t("label.dailyTeacherCalendar")}</h2>
          <div className="table-wrap schedule-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>{t("label.time")}</th>
                  {teachers.map((teacher) => (
                    <th key={teacher.id}>{teacher.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slotStartMinutes) => (
                  <tr key={slotStartMinutes}>
                    <th>{formatTimeFromMinutes(slotStartMinutes)}</th>
                    {teachers.map((teacher) => {
                      const slotBonusClasses = calendarBonusClasses.filter(
                        (bonusClass) =>
                          bonusClass.teacherId === teacher.id &&
                          bonusClassStartsInSlot(bonusClass, slotStartMinutes),
                      );

                      return (
                        <td className="schedule-cell" key={teacher.id}>
                          {slotBonusClasses.map((bonusClass) => (
                            <Link
                              className="schedule-event"
                              href={`/reception/bonus-classes/${bonusClass.id}`}
                              key={bonusClass.id}
                            >
                              <strong>
                                {formatStartTime(bonusClass.startTime)} |{" "}
                                {formatDuration(bonusClass.durationMinutes)}
                              </strong>
                              <span>{bonusClass.student.fullName}</span>
                              <span>{bonusClass.subject}</span>
                              <span>
                                {formatBonusClassStatus(
                                  bonusClass.status,
                                  currentUser.locale,
                                )}{" "}
                                |{" "}
                                {formatBonusClassStatus(
                                  bonusClass.attendanceStatus,
                                  currentUser.locale,
                                )}
                              </span>
                            </Link>
                          ))}
                        </td>
                      );
                    })}
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
