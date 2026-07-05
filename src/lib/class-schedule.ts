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

export function formatWeekdays(weekDays: string[]) {
  if (weekDays.length === 0) {
    return "-";
  }

  return weekdayOptions
    .filter((option) => weekDays.includes(option.value))
    .map((option) => option.shortLabel)
    .join(", ");
}

export function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "-";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(
    2,
    "0",
  )}`;
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
