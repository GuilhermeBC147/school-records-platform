import type { Weekday } from "@/generated/prisma/client";
import { readIsoDate } from "@/lib/bonus-classes";

export const calendarTimeSlots = Array.from(
  { length: 31 },
  (_, index) => 7 * 60 + index * 30,
);

const weekdayByJavaScriptDay: Record<number, Weekday> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export type CalendarClassEvent = {
  kind: "CLASS";
  id: string;
  date: Date;
  teacherId: string;
  teacherName: string;
  className: string;
  book: string | null;
  classType: string;
  startTime: string | null;
  durationMinutes: number;
  href: string;
};

export type CalendarBonusEvent = {
  kind: "BONUS";
  id: string;
  date: Date;
  teacherId: string;
  teacherName: string;
  studentName: string;
  subject: string;
  status: string;
  attendanceStatus: string;
  startTime: string;
  durationMinutes: number;
  href: string;
};

export type CalendarMeetingEvent = {
  kind: "MEETING";
  id: string;
  date: Date;
  teacherId: string;
  teacherName: string;
  title: string;
  startTime: string | null;
  durationMinutes: number;
  href: string;
};
export type CalendarPersonalSlotEvent = {
  kind: "PERSONAL_SLOT";
  id: string;
  date: Date;
  teacherId: string;
  teacherName: string;
  studentName: string;
  purpose: string;
  status: string;
  attendanceStatus: string;
  startTime: string;
  durationMinutes: number;
  href: string;
};

export type CalendarEvent =
  | CalendarClassEvent
  | CalendarBonusEvent
  | CalendarMeetingEvent
  | CalendarPersonalSlotEvent;

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayDateInputValue() {
  return dateKey(new Date());
}

export function safeCalendarDate(value: string | undefined) {
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

export function addCalendarDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

export function getCalendarWeekday(date: Date) {
  return weekdayByJavaScriptDay[date.getUTCDay()];
}

export function getCalendarWeekStart(date: Date) {
  return addCalendarDays(date, -((date.getUTCDay() + 6) % 7));
}

export function getCalendarWeekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(weekStart, index),
  );
}
