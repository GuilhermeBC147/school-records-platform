export function formatShortDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "2-digit",
  }).format(date);
}

export function formatShortDateInput(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

export function formatShortTimeInput(date: Date) {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}
