"use server";

import { redirect } from "next/navigation";
import { BonusClassAttendanceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  hasTeacherBonusClassOverlap,
  normalizeStartTime,
  readDurationMinutes,
  readIsoDate,
} from "@/lib/bonus-classes";

function readRequiredString(formData: FormData, key: string) {
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

async function requireReceptionOrAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return currentUser;
}

async function requireBonusClassStaff() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "RECEPTION" &&
    currentUser.role !== "TEACHER"
  ) {
    redirect("/dashboard");
  }

  return currentUser;
}

function readAttendanceStatus(formData: FormData) {
  const status = readRequiredString(formData, "attendanceStatus");

  if (!["PRESENT", "ABSENT", "EXCUSED"].includes(status)) {
    throw new Error("Attendance status is invalid.");
  }

  return status as BonusClassAttendanceStatus;
}

async function validateBonusClassForm(formData: FormData) {
  const durationMinutes = readDurationMinutes(formData.get("durationMinutes"));
  const notes = readRequiredString(formData, "notes") || null;
  const scheduledDate = readIsoDate(readRequiredString(formData, "scheduledDate"));
  const startTime = normalizeStartTime(readRequiredString(formData, "startTime"));
  const studentSearch = readRequiredString(formData, "studentSearch");
  const studentId = readRequiredString(formData, "studentId");
  const subject = readRequiredString(formData, "subject");
  const teacherId = readRequiredString(formData, "teacherId");

  if ((!studentId && !studentSearch) || !subject || !teacherId) {
    throw new Error("Student, subject, and teacher are required.");
  }

  const [student, teacher] = await Promise.all([
    prisma.student.findFirst({
      where: {
        isActive: true,
        ...(studentId
          ? { id: studentId }
          : { fullName: { equals: studentSearch, mode: "insensitive" } }),
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        id: teacherId,
        isActive: true,
        role: "TEACHER",
      },
      select: { id: true },
    }),
  ]);

  if (!student || !teacher) {
    throw new Error("Active student and teacher are required.");
  }

  return {
    durationMinutes,
    notes,
    scheduledDate,
    startTime,
    studentId: student.id,
    subject,
    teacherId: teacher.id,
  };
}

export async function createBonusClassAction(formData: FormData) {
  const currentUser = await requireReceptionOrAdmin();

  try {
    const data = await validateBonusClassForm(formData);
    const hasOverlap = await hasTeacherBonusClassOverlap(data);

    if (hasOverlap) {
      redirect("/reception/bonus-classes?error=overlap");
    }

    await prisma.bonusClass.create({
      data: {
        ...data,
        createdById: currentUser.id,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect("/reception/bonus-classes?error=invalid");
  }

  redirect("/reception/bonus-classes?status=created");
}

export async function updateBonusClassAction(formData: FormData) {
  const currentUser = await requireBonusClassStaff();

  const bonusClassId = readRequiredString(formData, "bonusClassId");

  try {
    const existingBonusClass = await prisma.bonusClass.findFirst({
      where: {
        id: bonusClassId,
        ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
      },
      select: { id: true },
    });

    if (!existingBonusClass) {
      redirect("/reception/bonus-classes?error=missing");
    }

    const data = await validateBonusClassForm(formData);
    const hasOverlap = await hasTeacherBonusClassOverlap({
      ...data,
      bonusClassId,
    });

    if (hasOverlap) {
      redirect(`/reception/bonus-classes/${bonusClassId}?error=overlap`);
    }

    await prisma.bonusClass.update({
      where: { id: bonusClassId },
      data,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(`/reception/bonus-classes/${bonusClassId}?error=invalid`);
  }

  redirect("/reception/bonus-classes?status=updated");
}

export async function cancelBonusClassAction(formData: FormData) {
  const currentUser = await requireBonusClassStaff();

  const bonusClassId = readRequiredString(formData, "bonusClassId");

  await prisma.bonusClass.updateMany({
    where: {
      id: bonusClassId,
      status: "SCHEDULED",
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    data: {
      status: "CANCELED",
    },
  });

  redirect("/reception/bonus-classes?status=canceled");
}

export async function completeBonusClassAction(formData: FormData) {
  const currentUser = await requireBonusClassStaff();
  const bonusClassId = readRequiredString(formData, "bonusClassId");
  const attendanceStatus = readAttendanceStatus(formData);

  await prisma.bonusClass.updateMany({
    where: {
      id: bonusClassId,
      status: "SCHEDULED",
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    data: {
      attendanceConfirmedAt: new Date(),
      attendanceConfirmedById: currentUser.id,
      attendanceStatus,
      completedAt: new Date(),
      status: "COMPLETED",
    },
  });

  const redirectTo = readRequiredString(formData, "redirectTo");

  redirect(redirectTo || "/dashboard/bonus-classes?status=completed");
}
