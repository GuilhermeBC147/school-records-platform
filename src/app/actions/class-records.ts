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
  const dateValue = String(formData.get("lessonDate") ?? "");

  if (!dateValue) {
    throw new Error("Lesson date is required.");
  }

  const dateMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);

  if (!dateMatch) {
    throw new Error("Lesson date must use DD/MM/YY format.");
  }

  const [, dayValue, monthValue, yearValue] = dateMatch;
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

async function persistClassRecord(
  formData: FormData,
  status: "DRAFT" | "SUBMITTED",
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const classId = String(formData.get("classId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const lessonName = String(formData.get("lessonName") ?? "").trim();
  const lessonDate = readLessonDate(formData);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!lessonName) {
    throw new Error("Lesson name is required.");
  }

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
    const existingLesson = lessonId
      ? await transaction.lesson.findFirst({
          where: {
            id: lessonId,
            classId,
          },
          select: {
            id: true,
            lessonDate: true,
            status: true,
          },
        })
      : await transaction.lesson.findUnique({
          where: {
            classId_lessonDate: { classId, lessonDate },
          },
          select: {
            id: true,
            lessonDate: true,
            status: true,
          },
        });

    if (!existingLesson && lessonId) {
      return;
    }

    if (!lessonId && existingLesson?.status === "SUBMITTED") {
      return;
    }

    if (
      lessonId &&
      existingLesson &&
      existingLesson.lessonDate.getTime() !== lessonDate.getTime()
    ) {
      const conflictingLesson = await transaction.lesson.findUnique({
        where: {
          classId_lessonDate: { classId, lessonDate },
        },
        select: { id: true },
      });

      if (conflictingLesson && conflictingLesson.id !== existingLesson.id) {
        return;
      }
    }

    const submissionFields =
      status === "SUBMITTED"
        ? {
            submittedAt: new Date(),
            submittedById: currentUser.id,
          }
        : {
            submittedAt: null,
            submittedById: null,
          };

    const lesson = existingLesson
      ? await transaction.lesson.update({
          where: { id: existingLesson.id },
          data: {
            lessonDate,
            name: lessonName,
            notes,
            status,
            ...submissionFields,
          },
          select: { id: true },
        })
      : await transaction.lesson.create({
          data: {
            classId,
            lessonDate,
            name: lessonName,
            notes,
            status,
            ...submissionFields,
          },
          select: { id: true },
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

export async function saveDraftClassRecordAction(formData: FormData) {
  await persistClassRecord(formData, "DRAFT");
}

export async function submitClassRecordAction(formData: FormData) {
  await persistClassRecord(formData, "SUBMITTED");
}
