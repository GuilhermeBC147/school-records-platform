"use server";

import { redirect } from "next/navigation";
import { TeacherWorkCategory } from "@/generated/prisma/enums";
import { readOptionalStartTime } from "@/lib/bonus-classes";
import { readDurationMinutes as readDurationInputMinutes } from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { teacherWorkCategories } from "@/lib/teacher-work";

const teacherWorkCategoryValues = teacherWorkCategories.map(
  (category) => category.value,
);
const allowedRedirects = new Set([
  "/admin/work-summary",
  "/dashboard/work",
  "/dashboard/work/new",
]);

function readWorkDate(formData: FormData) {
  const value = String(formData.get("workDate") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Work date is required.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const workDate = new Date(Date.UTC(year, month - 1, day));

  if (
    workDate.getUTCFullYear() !== year ||
    workDate.getUTCMonth() !== month - 1 ||
    workDate.getUTCDate() !== day
  ) {
    throw new Error("Work date is invalid.");
  }

  return workDate;
}

function readDurationMinutes(formData: FormData) {
  const durationMinutes = readDurationInputMinutes(formData.get("durationMinutes"));

  if (
    durationMinutes === null ||
    durationMinutes <= 0 ||
    durationMinutes > 720
  ) {
    throw new Error("Duration must be between 1 minute and 12 hours.");
  }

  return durationMinutes;
}

function readSelectedStudentIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("studentIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
}

export async function createTeacherWorkLogAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const category = String(formData.get("category") ?? "");
  const durationMinutes = readDurationMinutes(formData);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const requestedRedirect = String(
    formData.get("redirectTo") ?? "/dashboard/work",
  );
  const redirectTo = allowedRedirects.has(requestedRedirect)
    ? requestedRedirect
    : "/dashboard/work";
  const startTime = readOptionalStartTime(formData.get("startTime"));
  const selectedStudentIds = readSelectedStudentIds(formData);
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const workDate = readWorkDate(formData);

  if (!teacherWorkCategoryValues.includes(category as never)) {
    throw new Error("Work category is invalid.");
  }

  if (!title) {
    throw new Error("Work title is required.");
  }

  if (category === "BONUS_CLASS" && !subject) {
    throw new Error("Bonus class subject is required.");
  }

  const teacherId =
    currentUser.role === "ADMIN"
      ? String(formData.get("teacherId") ?? "")
      : currentUser.id;

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      isActive: true,
      role: "TEACHER",
    },
    select: { id: true },
  });

  if (!teacher) {
    throw new Error("Teacher account is required.");
  }

  const selectedStudents =
    selectedStudentIds.length > 0
      ? await prisma.student.findMany({
          where: {
            id: { in: selectedStudentIds },
            isActive: true,
          },
          select: { id: true },
        })
      : [];

  if (selectedStudents.length !== selectedStudentIds.length) {
    throw new Error("Choose active students for this activity.");
  }

  await prisma.teacherWorkLog.create({
    data: {
      category: category as TeacherWorkCategory,
      createdById: currentUser.id,
      durationMinutes,
      notes,
      startTime,
      subject,
      teacherId: teacher.id,
      title,
      workDate,
      students: {
        create: selectedStudentIds.map((studentId) => ({
          studentId,
        })),
      },
    },
  });

  redirect(`${redirectTo}?status=created`);
}

export async function createTeacherMeetingAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const durationMinutes = readDurationMinutes(formData);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const startTime = readOptionalStartTime(formData.get("startTime"));
  const teacherIds = formData
    .getAll("teacherIds")
    .map((value) => String(value))
    .filter(Boolean);
  const title = String(formData.get("title") ?? "").trim();
  const workDate = readWorkDate(formData);

  if (!title || teacherIds.length === 0) {
    throw new Error("Meeting title and teachers are required.");
  }

  const teachers = await prisma.user.findMany({
    where: {
      id: { in: teacherIds },
      isActive: true,
      role: "TEACHER",
    },
    select: { id: true },
  });

  if (teachers.length === 0) {
    throw new Error("Choose at least one active teacher.");
  }

  await prisma.teacherWorkLog.createMany({
    data: teachers.map((teacher) => ({
      category: "MEETING",
      createdById: currentUser.id,
      durationMinutes,
      notes,
      startTime,
      teacherId: teacher.id,
      title,
      workDate,
    })),
  });

  redirect("/admin/work-summary?status=meeting-created");
}
