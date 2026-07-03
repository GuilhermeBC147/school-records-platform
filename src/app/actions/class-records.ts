"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const attendanceStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
const homeworkStatuses = ["COMPLETED", "INCOMPLETE", "NOT_ASSIGNED"] as const;

function readStatus<T extends readonly string[]>(
  formData: FormData,
  key: string,
  allowedValues: T,
  fallback: T[number],
) {
  const value = String(formData.get(key) ?? "");
  return allowedValues.includes(value) ? (value as T[number]) : fallback;
}

function readLessonDate(formData: FormData) {
  const value = String(formData.get("lessonDate") ?? "");

  if (!value) {
    throw new Error("Lesson date is required.");
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);

  if (!match) {
    throw new Error("Lesson date must use DD/MM/YY format.");
  }

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year =
    yearValue.length === 2 ? Number(`20${yearValue}`) : Number(yearValue);
  const lessonDate = new Date(Date.UTC(year, month - 1, day));

  if (
    lessonDate.getUTCFullYear() !== year ||
    lessonDate.getUTCMonth() !== month - 1 ||
    lessonDate.getUTCDate() !== day
  ) {
    throw new Error("Lesson date is invalid.");
  }

  return lessonDate;
}

export async function submitClassRecordAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const classId = String(formData.get("classId") ?? "");
  const lessonDate = readLessonDate(formData);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const schoolClass = await prisma.class.findFirst({
    where: {
      id: classId,
      isActive: true,
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    select: {
      id: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          studentId: true,
        },
      },
    },
  });

  if (!schoolClass) {
    redirect("/dashboard");
  }

  await prisma.$transaction(async (transaction) => {
    const lesson = await transaction.lesson.upsert({
      where: {
        classId_lessonDate: {
          classId,
          lessonDate,
        },
      },
      create: {
        classId,
        lessonDate,
        notes,
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedById: currentUser.id,
      },
      update: {
        notes,
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedById: currentUser.id,
      },
      select: {
        id: true,
      },
    });

    for (const enrollment of schoolClass.enrollments) {
      const attendanceStatus = readStatus(
        formData,
        `attendance:${enrollment.studentId}`,
        attendanceStatuses,
        "PRESENT",
      );
      const homeworkStatus = readStatus(
        formData,
        `homework:${enrollment.studentId}`,
        homeworkStatuses,
        "NOT_ASSIGNED",
      );

      await transaction.attendanceRecord.upsert({
        where: {
          lessonId_studentId: {
            lessonId: lesson.id,
            studentId: enrollment.studentId,
          },
        },
        create: {
          lessonId: lesson.id,
          studentId: enrollment.studentId,
          status: attendanceStatus,
        },
        update: {
          status: attendanceStatus,
        },
      });

      await transaction.homeworkRecord.upsert({
        where: {
          lessonId_studentId: {
            lessonId: lesson.id,
            studentId: enrollment.studentId,
          },
        },
        create: {
          lessonId: lesson.id,
          studentId: enrollment.studentId,
          status: homeworkStatus,
        },
        update: {
          status: homeworkStatus,
        },
      });
    }
  });

  redirect(`/dashboard/classes/${classId}`);
}
