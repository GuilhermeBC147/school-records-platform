import type { AccountLocale } from "@/lib/locale";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { translate } from "@/lib/translations";

export const weekdayOptions = [
  { label: "Monday", shortLabel: "Mon", value: "MONDAY" },
  { label: "Tuesday", shortLabel: "Tue", value: "TUESDAY" },
  { label: "Wednesday", shortLabel: "Wed", value: "WEDNESDAY" },
  { label: "Thursday", shortLabel: "Thu", value: "THURSDAY" },
  { label: "Friday", shortLabel: "Fri", value: "FRIDAY" },
  { label: "Saturday", shortLabel: "Sat", value: "SATURDAY" },
  { label: "Sunday", shortLabel: "Sun", value: "SUNDAY" },
] as const;

export type WeekdayValue = (typeof weekdayOptions)[number]["value"];

export function formatWeekdays(
  weekDays: string[],
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  if (weekDays.length === 0) {
    return "-";
  }

  return weekdayOptions
    .filter((option) => weekDays.includes(option.value))
    .map((option) => {
      switch (option.value) {
        case "MONDAY":
          return translate(locale, "dashboard.weekdayMonday").slice(0, 3);
        case "TUESDAY":
          return translate(locale, "dashboard.weekdayTuesday").slice(0, 3);
        case "WEDNESDAY":
          return translate(locale, "dashboard.weekdayWednesday").slice(0, 3);
        case "THURSDAY":
          return translate(locale, "dashboard.weekdayThursday").slice(0, 3);
        case "FRIDAY":
          return translate(locale, "dashboard.weekdayFriday").slice(0, 3);
        case "SATURDAY":
          return translate(locale, "dashboard.weekdaySaturday").slice(0, 3);
        case "SUNDAY":
          return translate(locale, "dashboard.weekdaySunday").slice(0, 3);
      }
    })
    .join(", ");
}

export function formatClockTimeFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "-";
  }

  return formatClockTimeFromMinutes(minutes);
}

export function readDurationMinutes(value: FormDataEntryValue | null) {
  const duration = String(value ?? "").trim();

  if (/^\d+$/.test(duration)) {
    return Number(duration);
  }

  if (!/^\d{1,2}:[0-5]\d$/.test(duration)) {
    return null;
  }

  const [hours, minutes] = duration.split(":").map(Number);

  return hours * 60 + minutes;
}
