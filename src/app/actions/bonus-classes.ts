"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  hasTeacherBonusClassOverlap,
  readDurationMinutes,
  readIsoDate,
  readTimeMinutes,
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

async function requireReception() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION") {
    redirect("/dashboard");
  }

  return currentUser;
}

async function requireTeacher() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  return currentUser;
}

async function validateBonusClassForm(formData: FormData) {
  const durationMinutes = readDurationMinutes(formData.get("durationMinutes"));
  const notes = readRequiredString(formData, "notes") || null;
  const scheduledDate = readIsoDate(readRequiredString(formData, "scheduledDate"));
  const startTime = readRequiredString(formData, "startTime");
  const studentId = readRequiredString(formData, "studentId");
  const subject = readRequiredString(formData, "subject");
  const teacherId = readRequiredString(formData, "teacherId");

  readTimeMinutes(startTime);

  if (!studentId || !subject || !teacherId) {
    throw new Error("Student, subject, and teacher are required.");
  }

  const [student, teacher] = await Promise.all([
    prisma.student.findFirst({
      where: {
        id: studentId,
        isActive: true,
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
  const currentUser = await requireReception();

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
  await requireReception();

  const bonusClassId = readRequiredString(formData, "bonusClassId");

  try {
    const existingBonusClass = await prisma.bonusClass.findFirst({
      where: {
        id: bonusClassId,
        status: "SCHEDULED",
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
  await requireReception();

  const bonusClassId = readRequiredString(formData, "bonusClassId");

  await prisma.bonusClass.updateMany({
    where: {
      id: bonusClassId,
      status: "SCHEDULED",
    },
    data: {
      status: "CANCELED",
    },
  });

  redirect("/reception/bonus-classes?status=canceled");
}

export async function completeBonusClassAction(formData: FormData) {
  const currentUser = await requireTeacher();
  const bonusClassId = readRequiredString(formData, "bonusClassId");

  await prisma.bonusClass.updateMany({
    where: {
      id: bonusClassId,
      status: "SCHEDULED",
      teacherId: currentUser.id,
    },
    data: {
      completedAt: new Date(),
      status: "COMPLETED",
    },
  });

  redirect("/dashboard/bonus-classes?status=completed");
}
