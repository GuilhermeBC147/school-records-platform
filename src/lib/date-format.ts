export const accountDateFormatOptions = [
  {
    example: "05/07/26",
    label: "DD/MM/YY",
    value: "DD_MM_YY",
  },
  {
    example: "07/05/26",
    label: "MM/DD/YY",
    value: "MM_DD_YY",
  },
  {
    example: "2026-07-05",
    label: "YYYY-MM-DD",
    value: "YYYY_MM_DD",
  },
] as const;

export type AccountDateFormat = (typeof accountDateFormatOptions)[number]["value"];

export const defaultAccountDateFormat: AccountDateFormat = "DD_MM_YY";

export function normalizeAccountDateFormat(
  value: FormDataEntryValue | string | null | undefined,
): AccountDateFormat {
  return accountDateFormatOptions.some((option) => option.value === value)
    ? (value as AccountDateFormat)
    : defaultAccountDateFormat;
}

function toTwoDigitYear(year: number) {
  return String(year).slice(-2);
}

function toFullYear(year: string) {
  if (year.length === 2) {
    return 2000 + Number(year);
  }

  return Number(year);
}

function formatUtcDateParts(date: Date) {
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    year: String(date.getUTCFullYear()),
    yearShort: toTwoDigitYear(date.getUTCFullYear()),
  };
}

function isValidIsoDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toIsoDate(year: number, month: number, day: number) {
  if (!isValidIsoDateParts(year, month, day)) {
    return "";
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function parseDateInputToIso(
  value: string,
  dateFormat: AccountDateFormat = defaultAccountDateFormat,
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (dateFormat === "YYYY_MM_DD") {
    const match = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (!match) {
      return "";
    }

    return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  const match = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

  if (!match) {
    return "";
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = toFullYear(match[3]);

  return dateFormat === "MM_DD_YY"
    ? toIsoDate(year, first, second)
    : toIsoDate(year, second, first);
}

export function formatIsoDateInput(
  value: string,
  dateFormat: AccountDateFormat = defaultAccountDateFormat,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!isValidIsoDateParts(year, month, day)) {
    return value;
  }

  return formatShortDateInput(
    new Date(Date.UTC(year, month - 1, day)),
    dateFormat,
  );
}

export function formatShortDateTime(
  date: Date,
  dateFormat: AccountDateFormat = defaultAccountDateFormat,
) {
  const locale = dateFormat === "MM_DD_YY" ? "en-US" : "en-GB";

  if (dateFormat === "YYYY_MM_DD") {
    const dateLabel = formatShortDateInput(date, dateFormat);
    const timeLabel = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      hourCycle: "h23",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date);

    return `${dateLabel}, ${timeLabel}`;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "2-digit",
  }).format(date);
}

export function formatShortDate(
  date: Date,
  dateFormat: AccountDateFormat = defaultAccountDateFormat,
) {
  if (dateFormat === "YYYY_MM_DD") {
    return formatShortDateInput(date, dateFormat);
  }

  return new Intl.DateTimeFormat(dateFormat === "MM_DD_YY" ? "en-US" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "2-digit",
  }).format(date);
}

export function formatShortDateInput(
  date: Date,
  dateFormat: AccountDateFormat = defaultAccountDateFormat,
) {
  const { day, month, year, yearShort } = formatUtcDateParts(date);

  if (dateFormat === "YYYY_MM_DD") {
    return `${year}-${month}-${day}`;
  }

  if (dateFormat === "MM_DD_YY") {
    return `${month}/${day}/${yearShort}`;
  }

  return `${day}/${month}/${yearShort}`;
}
