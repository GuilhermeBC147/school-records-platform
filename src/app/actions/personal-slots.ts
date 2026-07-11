"use server";

import { redirect } from "next/navigation";
import { BonusClassAttendanceStatus } from "@/generated/prisma/enums";
import {
  normalizeStartTime,
  readDurationMinutes,
  readIsoDate,
} from "@/lib/bonus-classes";
import { hasPersonalSlotCapacityConflict } from "@/lib/personal-slots";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function requirePersonalSlotManager() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "RECEPTION") {
    redirect("/dashboard");
  }

  return user;
}

async function requireTeacher() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard");

  return user;
}

function readAttendanceStatus(formData: FormData) {
  const status = value(formData, "attendanceStatus");

  if (!["PENDING", "PRESENT", "ABSENT", "EXCUSED"].includes(status)) {
    throw new Error("Invalid personal-slot attendance status.");
  }

  return status as BonusClassAttendanceStatus;
}

export async function createPersonalSlotBookingAction(formData: FormData) {
  const user = await requirePersonalSlotManager();

  try {
    const scheduledDate = readIsoDate(value(formData, "scheduledDate"));
    const startTime = normalizeStartTime(value(formData, "startTime"));
    const durationMinutes = readDurationMinutes(formData.get("durationMinutes"));
    const studentId = value(formData, "studentId");
    const teacherId = value(formData, "teacherId");
    const purpose = value(formData, "purpose");
    const [student, teacher] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, isActive: true },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { id: teacherId, isActive: true, role: "TEACHER" },
        select: { id: true },
      }),
    ]);

    if (!student || !teacher || !purpose) throw new Error("Invalid booking.");

    if (
      await hasPersonalSlotCapacityConflict({
        date: scheduledDate,
        durationMinutes,
        startTime,
        teacherId,
      })
    ) {
      redirect("/reception/personal-slots?error=capacity");
    }

    await prisma.personalSlotBooking.create({
      data: {
        createdById: user.id,
        durationMinutes,
        notes: value(formData, "notes") || null,
        purpose,
        scheduledDate,
        startTime,
        studentId,
        teacherId,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/reception/personal-slots?error=invalid");
  }

  redirect("/reception/personal-slots?status=created");
}

export async function updatePersonalSlotBookingStatusAction(formData: FormData) {
  const user = await requirePersonalSlotManager();
  const id = value(formData, "bookingId");
  const status = value(formData, "status");

  if (status !== "COMPLETED" && status !== "CANCELED") {
    redirect("/reception/personal-slots?error=invalid");
  }

  await prisma.personalSlotBooking.updateMany({
    where: { id, status: "SCHEDULED" },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
      ...(status === "COMPLETED"
        ? {
            attendanceConfirmedAt: new Date(),
            attendanceConfirmedById: user.id,
            attendanceStatus: "PRESENT",
          }
        : {
            attendanceConfirmedAt: null,
            attendanceConfirmedById: null,
          }),
    },
  });

  redirect("/reception/personal-slots?status=updated");
}

export async function confirmPersonalSlotBookingAction(formData: FormData) {
  const teacher = await requireTeacher();
  const id = value(formData, "bookingId");

  try {
    const attendanceStatus = readAttendanceStatus(formData);

    if (attendanceStatus === "PENDING") {
      throw new Error("Attendance must be confirmed.");
    }

    await prisma.personalSlotBooking.updateMany({
      where: {
        id,
        status: "SCHEDULED",
        teacherId: teacher.id,
      },
      data: {
        attendanceConfirmedAt: new Date(),
        attendanceConfirmedById: teacher.id,
        attendanceStatus,
        completedAt: new Date(),
        status: "COMPLETED",
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/dashboard/personal-slots?error=invalid");
  }

  redirect("/dashboard/personal-slots?status=confirmed");
}
