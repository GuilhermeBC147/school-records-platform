import {
  calendarTimeSlots,
  dateKey,
  getCalendarWeekday,
  type CalendarEvent,
} from "@/lib/calendar";
import {
  formatDuration,
  formatClockTimeFromMinutes,
  readTimeMinutes,
} from "@/lib/class-schedule";
import { formatStartTime, formatBonusClassStatus } from "@/lib/bonus-classes";
import { formatShortDate } from "@/lib/date-format";
import type { AccountDateFormat } from "@/lib/date-format";
import type { AccountLocale } from "@/lib/locale";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import type { Weekday } from "@/generated/prisma/client";
import Link from "next/link";

const weekdayTranslationKeys = {
  FRIDAY: "dashboard.weekdayFriday",
  MONDAY: "dashboard.weekdayMonday",
  SATURDAY: "dashboard.weekdaySaturday",
  SUNDAY: "dashboard.weekdaySunday",
  THURSDAY: "dashboard.weekdayThursday",
  TUESDAY: "dashboard.weekdayTuesday",
  WEDNESDAY: "dashboard.weekdayWednesday",
} as const satisfies Record<Weekday, TranslationKey>;

type CalendarGridProps = {
  dateFormat: AccountDateFormat;
  dates: Date[];
  events: CalendarEvent[];
  locale: AccountLocale;
  mode: "day" | "week";
  teachers: Array<{ id: string; name: string }>;
  t: ReturnType<typeof getTranslations>;
};

function formatClassType(
  classType: string,
  t: ReturnType<typeof getTranslations>,
) {
  switch (classType) {
    case "VIP":
      return t("classType.vip");
    case "PERSONAL":
      return t("classType.personal");
    default:
      return t("classType.regular");
  }
}

function eventColumnKey(event: CalendarEvent, mode: CalendarGridProps["mode"]) {
  return mode === "day" ? event.teacherId : dateKey(event.date);
}

function eventStartsInSlot(event: CalendarEvent, slotStartMinutes: number) {
  const startMinutes = readTimeMinutes(event.startTime ?? "");

  return (
    startMinutes !== null &&
    startMinutes >= slotStartMinutes &&
    startMinutes < slotStartMinutes + 30
  );
}

function eventLabel(
  event: CalendarEvent,
  locale: AccountLocale,
  t: ReturnType<typeof getTranslations>,
) {
  if (event.kind === "CLASS") {
    return (
      <>
        <strong>
          {formatStartTime(event.startTime)} | {formatDuration(event.durationMinutes)}
        </strong>
        <span>{event.className}</span>
        <span>{formatClassType(event.classType, t)}</span>
      </>
    );
  }

  return (
    <>
      <strong>
        {formatStartTime(event.startTime)} | {formatDuration(event.durationMinutes)}
      </strong>
      <span>{event.studentName}</span>
      <span>{event.subject}</span>
      <span>
        {formatBonusClassStatus(event.status, locale)} |{" "}
        {formatBonusClassStatus(event.attendanceStatus, locale)}
      </span>
    </>
  );
}

export function CalendarGrid({
  dateFormat,
  dates,
  events,
  locale,
  mode,
  teachers,
  t,
}: CalendarGridProps) {
  const columns =
    mode === "day"
      ? teachers.map((teacher) => ({
          key: teacher.id,
          label: teacher.name,
        }))
      : dates.map((date) => {
          const weekday = getCalendarWeekday(date);

          return {
            key: dateKey(date),
            label: `${t(weekdayTranslationKeys[weekday])} ${formatShortDate(
              date,
              dateFormat,
            )}`,
          };
        });

  return (
    <div className="table-wrap schedule-wrap">
      <table className={`schedule-table calendar-grid-table ${mode}-calendar-grid`}>
        <thead>
          <tr>
            <th>{t("label.time")}</th>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarTimeSlots.map((slotStartMinutes) => (
            <tr key={slotStartMinutes}>
              <th>{formatClockTimeFromMinutes(slotStartMinutes)}</th>
              {columns.map((column) => {
                const slotEvents = events.filter(
                  (event) =>
                    eventColumnKey(event, mode) === column.key &&
                    eventStartsInSlot(event, slotStartMinutes),
                );

                return (
                  <td className="schedule-cell" key={column.key}>
                    {slotEvents.map((event) => (
                      <Link
                        className={`schedule-event schedule-event-${event.kind.toLowerCase()}`}
                        href={event.href}
                        key={`${event.kind}-${event.id}`}
                      >
                        {eventLabel(event, locale, t)}
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
  );
}
