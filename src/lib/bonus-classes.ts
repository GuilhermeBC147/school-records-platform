import { prisma } from "@/lib/prisma";
import type { AccountLocale } from "@/lib/locale";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { translate } from "@/lib/translations";
import {
  formatClockTimeFromMinutes,
  readDurationMinutes as readDurationInputMinutes,
} from "@/lib/class-schedule";

export function formatBonusClassStatus(
  status: string,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (status) {
    case "APPROVED":
      return translate(locale, "option.statusApproved");
    case "CANCELED":
      return translate(locale, "option.statusCanceled");
    case "COMPLETED":
      return translate(locale, "option.statusCompleted");
    case "PENDING":
      return translate(locale, "option.statusPending");
    case "PENDING_APPROVAL":
      return translate(locale, "option.statusPendingApproval");
    case "PRESENT":
      return translate(locale, "option.attendancePresent");
    case "ABSENT":
      return translate(locale, "option.attendanceAbsent");
    case "EXCUSED":
      return translate(locale, "option.attendanceExcused");
    case "REJECTED":
      return translate(locale, "option.statusRejected");
    case "SCHEDULED":
      return translate(locale, "option.statusScheduled");
    default:
      return status;
  }
}

export function formatBonusClassResultMessage(
  status: string | undefined,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (status) {
    case "attendance":
      return translate(locale, "message.bonusAttendanceConfirmed");
    case "canceled":
      return translate(locale, "message.bonusCanceled");
    case "completed":
      return translate(locale, "message.bonusCompleted");
    case "created":
      return translate(locale, "message.bonusCreated");
    case "updated":
      return translate(locale, "message.bonusUpdated");
    default:
      return null;
  }
}

export function formatBonusClassErrorMessage(
  error: string | undefined,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (error) {
    case "invalid":
      return translate(locale, "message.bonusInvalid");
    case "missing":
      return translate(locale, "message.bonusMissing");
    case "overlap":
      return translate(locale, "message.bonusOverlap");
    default:
      return null;
  }
}

export function formatStartTime(startTime: string | null) {
  if (!startTime) {
    return "-";
  }

  try {
    return normalizeStartTime(startTime);
  } catch {
    return startTime;
  }
}

export function formatTimeFromMinutes(totalMinutes: number) {
  return formatClockTimeFromMinutes(totalMinutes);
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
  const normalizedTime = normalizeStartTime(value);
  const [hours, minutes] = normalizedTime.split(":").map(Number);

  return hours * 60 + minutes;
}

export function normalizeStartTime(value: string) {
  const trimmedValue = value.trim();

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue)) {
    throw new Error("Start time is invalid.");
  }

  return trimmedValue;
}

export function readOptionalStartTime(value: FormDataEntryValue | null) {
  const startTime = String(value ?? "").trim();

  return startTime ? normalizeStartTime(startTime) : null;
}

export function readDurationMinutes(value: FormDataEntryValue | null) {
  const durationMinutes = readDurationInputMinutes(value);

  if (
    durationMinutes === null ||
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
