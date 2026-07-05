import { prisma } from "@/lib/prisma";

export function formatBonusClassStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatBonusClassResultMessage(status: string | undefined) {
  switch (status) {
    case "attendance":
      return "Bonus class attendance confirmed.";
    case "canceled":
      return "Bonus class canceled.";
    case "completed":
      return "Bonus class completed.";
    case "created":
      return "Bonus class scheduled.";
    case "updated":
      return "Bonus class updated.";
    default:
      return null;
  }
}

export function formatBonusClassErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid":
      return "Check the bonus class details and try again.";
    case "missing":
      return "That bonus class could not be found.";
    case "overlap":
      return "This teacher already has a bonus class during that time.";
    default:
      return null;
  }
}

export function formatStartTime(startTime: string | null) {
  return startTime || "-";
}

export function formatTimeFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function readIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date is required.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Date is invalid.");
  }

  return date;
}

export function readTimeMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error("Start time is required.");
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    throw new Error("Start time is invalid.");
  }

  return hours * 60 + minutes;
}

export function readDurationMinutes(value: FormDataEntryValue | null) {
  const durationMinutes = Number(value);

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 720
  ) {
    throw new Error("Duration must be between 1 minute and 12 hours.");
  }

  return durationMinutes;
}

export async function hasTeacherBonusClassOverlap({
  bonusClassId,
  durationMinutes,
  scheduledDate,
  startTime,
  teacherId,
}: {
  bonusClassId?: string;
  durationMinutes: number;
  scheduledDate: Date;
  startTime: string;
  teacherId: string;
}) {
  const startMinutes = readTimeMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  const existingBonusClasses = await prisma.bonusClass.findMany({
    where: {
      scheduledDate,
      status: {
        not: "CANCELED",
      },
      teacherId,
      ...(bonusClassId ? { NOT: { id: bonusClassId } } : {}),
    },
    select: {
      durationMinutes: true,
      startTime: true,
    },
  });

  return existingBonusClasses.some((bonusClass) => {
    const existingStart = readTimeMinutes(bonusClass.startTime);
    const existingEnd = existingStart + bonusClass.durationMinutes;

    return startMinutes < existingEnd && existingStart < endMinutes;
  });
}
