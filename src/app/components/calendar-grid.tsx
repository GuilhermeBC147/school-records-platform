import type { Weekday } from "@/generated/prisma/client";
import { formatBonusClassStatus, formatStartTime } from "@/lib/bonus-classes";
import {
  calendarTimeSlots,
  dateKey,
  getCalendarWeekday,
  type CalendarEvent,
} from "@/lib/calendar";
import {
  formatClockTimeFromMinutes,
  formatDuration,
  readTimeMinutes,
} from "@/lib/class-schedule";
import type { AccountDateFormat } from "@/lib/date-format";
import { formatShortDate } from "@/lib/date-format";
import type { AccountLocale } from "@/lib/locale";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarGridScrollSync } from "./calendar-grid-scroll-sync";

const calendarRowHeight = 70;
const calendarStartMinutes = calendarTimeSlots[0];
const calendarLastStartMinutes = calendarTimeSlots[calendarTimeSlots.length - 1];

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
  collapseOverlaps?: boolean;
  dateFormat: AccountDateFormat;
  dates: Date[];
  events: CalendarEvent[];
  locale: AccountLocale;
  mode: "day" | "week";
  teachers: Array<{ id: string; name: string }>;
  t: ReturnType<typeof getTranslations>;
};

type CalendarGridItem = {
  durationMinutes: number;
  events: CalendarEvent[];
  lane: number;
  startMinutes: number;
};

type CalendarEventStyle = CSSProperties & {
  "--calendar-event-height": string;
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

function eventStartMinutes(event: CalendarEvent) {
  return readTimeMinutes(event.startTime ?? "");
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
        <span className="schedule-event-title">{event.className}</span>
        <span className="schedule-event-book">
          {event.book ?? t("calendar.noBook")}
        </span>
        <span className="schedule-event-meta">
          {formatClassType(event.classType, t)} / {event.teacherName}
        </span>
      </>
    );
  }

  if (event.kind === "MEETING") {
    return (
      <>
        <strong>
          {formatStartTime(event.startTime)} | {formatDuration(event.durationMinutes)}
        </strong>
        <span className="schedule-event-title">{event.title}</span>
        <span className="schedule-event-meta">
          {t("workCategory.MEETING")} / {event.teacherName}
        </span>
      </>
    );
  }

  if (event.kind === "PERSONAL_SLOT") {
    const status =
      event.status === "COMPLETED"
        ? t("personalSlots.completed")
        : event.status === "CANCELED"
          ? t("personalSlots.canceled")
          : t("personalSlots.scheduled");

    const attendance =
      event.attendanceStatus === "PRESENT"
        ? t("personalSlots.present")
        : event.attendanceStatus === "ABSENT"
          ? t("personalSlots.absent")
          : event.attendanceStatus === "EXCUSED"
            ? t("personalSlots.excused")
            : t("personalSlots.attendancePending");

    return <><strong>{formatStartTime(event.startTime)} | {formatDuration(event.durationMinutes)}</strong><span className="schedule-event-title">{event.studentName}</span><span className="schedule-event-book">{event.purpose}</span><span className="schedule-event-meta">{event.teacherName} / {status} / {attendance}</span></>;
  }

  return (
    <>
      <strong>
        {formatStartTime(event.startTime)} | {formatDuration(event.durationMinutes)}
      </strong>
      <span className="schedule-event-title">{event.studentName}</span>
      <span className="schedule-event-book">{event.subject}</span>
      <span className="schedule-event-meta">{event.teacherName}</span>
      <span className="schedule-event-meta">
        {formatBonusClassStatus(event.status, locale)} |{" "}
        {formatBonusClassStatus(event.attendanceStatus, locale)}
      </span>
    </>
  );
}

function groupOverlappingEvents(events: CalendarEvent[]) {
  const sortedEvents = events
    .filter((event) => eventStartMinutes(event) !== null)
    .sort(
      (left, right) =>
        eventStartMinutes(left)! - eventStartMinutes(right)!,
    );
  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];
  let currentGroupEnd = -1;

  for (const event of sortedEvents) {
    const startMinutes = eventStartMinutes(event);
    if (startMinutes === null) continue;
    const endMinutes = startMinutes + event.durationMinutes;

    if (currentGroup.length > 0 && startMinutes >= currentGroupEnd) {
      groups.push(currentGroup);
      currentGroup = [];
      currentGroupEnd = -1;
    }

    currentGroup.push(event);
    currentGroupEnd = Math.max(currentGroupEnd, endMinutes);
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function buildCalendarItems(
  events: CalendarEvent[],
  collapseOverlaps: boolean,
) {
  const eventGroups = collapseOverlaps
    ? groupOverlappingEvents(events)
    : events.map((event) => [event]);
  const items: CalendarGridItem[] = [];

  for (const eventGroup of eventGroups) {
    const startMinutes = eventStartMinutes(eventGroup[0]);

    if (
      startMinutes === null ||
      startMinutes < calendarStartMinutes ||
      startMinutes > calendarLastStartMinutes
    ) {
      continue;
    }

    const groupEndMinutes = Math.max(
      ...eventGroup.map(
        (event) => eventStartMinutes(event)! + event.durationMinutes,
      ),
    );

    items.push({
      durationMinutes: groupEndMinutes - startMinutes,
      events: eventGroup,
      lane: 0,
      startMinutes,
    });
  }

  items.sort(
    (left, right) =>
      left.startMinutes - right.startMinutes ||
      right.durationMinutes - left.durationMinutes,
  );

  const laneEndMinutes: number[] = [];

  return items.map((item) => {
    const lane = laneEndMinutes.findIndex(
      (endMinutes) => endMinutes <= item.startMinutes,
    );
    const resolvedLane = lane === -1 ? laneEndMinutes.length : lane;

    laneEndMinutes[resolvedLane] =
      item.startMinutes + item.durationMinutes;

    return {
      ...item,
      lane: resolvedLane,
    };
  });
}

function getEventStyle(
  item: CalendarGridItem,
  laneCount: number,
): CalendarEventStyle {
  const laneWidth = 100 / laneCount;
  const height = Math.max(
    (item.durationMinutes / 30) * calendarRowHeight - 8,
    42,
  );

  return {
    "--calendar-event-height": `${height}px`,
    left: `${item.lane * laneWidth}%`,
    top: `${((item.startMinutes - calendarStartMinutes) / 30) * calendarRowHeight}px`,
    width: `calc(${laneWidth}% - 6px)`,
  };
}

function CalendarEventCard({
  className,
  event,
  locale,
  style,
  t,
}: {
  className?: string;
  event: CalendarEvent;
  locale: AccountLocale;
  style?: CSSProperties;
  t: ReturnType<typeof getTranslations>;
}) {
  return (
    <Link
      className={
        className ?? `schedule-event schedule-event-${event.kind.toLowerCase()}`
      }
      href={event.href}
      style={style}
    >
      {eventLabel(event, locale, t)}
    </Link>
  );
}

export function CalendarGrid({
  collapseOverlaps = false,
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
  const columnCount = Math.max(columns.length, 1);
  const boardStyle = {
    "--calendar-column-count": columnCount,
  } as CSSProperties;

  return (
    <div
      className="calendar-grid-shell calendar-grid-wrap"
      data-calendar-grid-shell
    >
      <div
        className="calendar-grid-header-scroll"
        data-calendar-grid-header-scroll
      >
        <div
          className={`schedule-table calendar-grid-board calendar-grid-header-board ${mode}-calendar-grid`}
          style={boardStyle}
        >
          <div className="calendar-grid-corner">{t("label.time")}</div>
          {columns.map((column) => (
            <div className="calendar-grid-header" key={column.key}>
              {column.label}
            </div>
          ))}
        </div>
      </div>
      <div
        className="calendar-grid-body-scroll"
        data-calendar-grid-body-scroll
      >
        <div
          className={`schedule-table calendar-grid-board calendar-grid-body-board ${mode}-calendar-grid`}
          style={boardStyle}
        >
          <div className="calendar-grid-time-column">
            {calendarTimeSlots.map((slotStartMinutes) => (
              <div className="calendar-grid-time-slot" key={slotStartMinutes}>
                {formatClockTimeFromMinutes(slotStartMinutes)}
              </div>
            ))}
          </div>
          {columns.map((column) => {
            const columnEvents = events.filter(
              (event) => eventColumnKey(event, mode) === column.key,
            );
            const items = buildCalendarItems(columnEvents, collapseOverlaps);
            const laneCount = Math.max(
              1,
              ...items.map((item) => item.lane + 1),
            );

            return (
              <div className="calendar-grid-column" key={column.key}>
                {items.map((item) => {
                  const style = getEventStyle(item, laneCount);

                  if (item.events.length === 1) {
                    const event = item.events[0];

                    return (
                      <CalendarEventCard
                        className={`schedule-event schedule-event-positioned schedule-event-${event.kind.toLowerCase()}`}
                        event={event}
                        key={`${event.kind}-${event.id}`}
                        locale={locale}
                        style={style}
                        t={t}
                      />
                    );
                  }

                  const personalEvents = item.events.filter(
                    (event) => event.kind === "PERSONAL_SLOT",
                  );
                  const isPersonalGroup =
                    personalEvents.length === item.events.length &&
                    personalEvents.length > 1;

                  return (
                    <details
                      className={`schedule-event-group schedule-event-positioned schedule-event-overlap-group${isPersonalGroup ? " schedule-event-personal-group" : ""}`}
                      key={`group-${item.startMinutes}-${item.events.map((event) => `${event.kind}-${event.id}`).join("-")}`}
                      style={style}
                    >
                      <summary className="schedule-event-group-summary">
                        {isPersonalGroup ? (
                          <>
                            <strong>
                              {personalEvents.length}/3 {t("personalSlots.occupied")}
                            </strong>
                            <span>
                              {t("personalSlots.title")} | {formatDuration(item.durationMinutes)} | {t("personalSlots.expand")}
                            </span>
                          </>
                        ) : (
                          <>
                            <strong>
                              {item.events.length} {t("calendar.overlappingEvents")}
                            </strong>
                            <span>
                              {formatStartTime(item.events[0].startTime)} | {t("calendar.expandOverlaps")}
                            </span>
                          </>
                        )}
                      </summary>
                      <div className="schedule-event-group-items">
                        {item.events.map((event) => (
                          <CalendarEventCard
                            className={`schedule-event schedule-event-nested schedule-event-${event.kind.toLowerCase()}`}
                            event={event}
                            key={`${event.kind}-${event.id}`}
                            locale={locale}
                            t={t}
                          />
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <CalendarGridScrollSync />
    </div>
  );
}
