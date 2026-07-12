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

export const classTypeOptions = [
  { value: "REGULAR", translationKey: "classType.regular" },
  { value: "VIP", translationKey: "classType.vip" },
  { value: "PERSONAL", translationKey: "classType.personal" },
] as const;

export type ClassTypeValue = (typeof classTypeOptions)[number]["value"];

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

export function formatCompactDuration(minutes: number | null) {
  if (!minutes) {
    return "-";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}M`;
  }

  if (remainingMinutes === 0) {
    return `${hours}H`;
  }

  return `${hours}H${remainingMinutes}M`;
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

export function normalizeStartTime(value: string) {
  const trimmedValue = value.trim();

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

export function readOptionalStartTime(value: FormDataEntryValue | null) {
  const startTime = String(value ?? "").trim();

  return startTime ? normalizeStartTime(startTime) : null;
}

export function readTimeMinutes(value: string) {
  const normalizedTime = normalizeStartTime(value);

  if (!normalizedTime) {
    return null;
  }

  const [hours, minutes] = normalizedTime.split(":").map(Number);

  return hours * 60 + minutes;
}

export function hasTimeOverlap({
  durationMinutes,
  existingDurationMinutes,
  existingStartTime,
  startTime,
}: {
  durationMinutes: number;
  existingDurationMinutes: number;
  existingStartTime: string;
  startTime: string;
}) {
  const startMinutes = readTimeMinutes(startTime);
  const existingStartMinutes = readTimeMinutes(existingStartTime);

  if (startMinutes === null || existingStartMinutes === null) {
    return false;
  }

  const endMinutes = startMinutes + durationMinutes;
  const existingEndMinutes = existingStartMinutes + existingDurationMinutes;

  return startMinutes < existingEndMinutes && existingStartMinutes < endMinutes;
}
