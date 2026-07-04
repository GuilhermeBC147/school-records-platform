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

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes} min`;
}
