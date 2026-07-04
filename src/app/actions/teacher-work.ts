"use server";

import { redirect } from "next/navigation";
import { TeacherWorkCategory } from "@/generated/prisma/enums";
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
  const durationMinutes = Number(formData.get("durationMinutes"));

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 720
  ) {
    throw new Error("Duration must be between 1 minute and 12 hours.");
  }

  return durationMinutes;
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
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
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
    },
  });

  redirect(`${redirectTo}?status=created`);
}
