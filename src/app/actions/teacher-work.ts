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
const allowedErrorRedirects = new Set([
  "/admin/work-summary/new-activity",
  "/admin/work-summary/new-meeting",
  "/dashboard/work/new",
]);

function readErrorRedirect(formData: FormData, fallback: string) {
  const requestedRedirect = String(formData.get("errorRedirectTo") ?? fallback);

  return allowedErrorRedirects.has(requestedRedirect)
    ? requestedRedirect
    : fallback;
}

function redirectWithWorkError(redirectTo: string, error: string): never {
  redirect(`${redirectTo}?error=${error}`);
}

function readWorkDate(formData: FormData, errorRedirectTo: string) {
  const value = String(formData.get("workDate") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    redirectWithWorkError(errorRedirectTo, "invalid");
  }

  const [year, month, day] = value.split("-").map(Number);
  const workDate = new Date(Date.UTC(year, month - 1, day));

  if (
    workDate.getUTCFullYear() !== year ||
    workDate.getUTCMonth() !== month - 1 ||
    workDate.getUTCDate() !== day
  ) {
    redirectWithWorkError(errorRedirectTo, "invalid");
  }

  return workDate;
}

function readDurationMinutes(formData: FormData, errorRedirectTo: string) {
  const durationMinutes = readDurationInputMinutes(formData.get("durationMinutes"));

  if (
    durationMinutes === null ||
    durationMinutes <= 0 ||
    durationMinutes > 720
  ) {
    redirectWithWorkError(errorRedirectTo, "invalid");
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

  const errorRedirectTo = readErrorRedirect(formData, "/dashboard/work/new");
  const category = String(formData.get("category") ?? "");
  const durationMinutes = readDurationMinutes(formData, errorRedirectTo);
  const requireCompleteActivity =
    String(formData.get("requireCompleteActivity") ?? "") === "1";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const requestedRedirect = String(
    formData.get("redirectTo") ?? "/dashboard/work",
  );
  const redirectTo = allowedRedirects.has(requestedRedirect)
    ? requestedRedirect
    : "/dashboard/work";
  const startTimeValue = String(formData.get("startTime") ?? "").trim();
  const startTime = readOptionalStartTime(startTimeValue);
  const selectedStudentIds = readSelectedStudentIds(formData);
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const workDate = readWorkDate(formData, errorRedirectTo);

  if (!teacherWorkCategoryValues.includes(category as never)) {
    redirectWithWorkError(errorRedirectTo, "invalid");
  }

  if (!title) {
    redirectWithWorkError(errorRedirectTo, "invalid");
  }

  if ((category === "BONUS_CLASS" || requireCompleteActivity) && !subject) {
    redirectWithWorkError(errorRedirectTo, "invalid");
  }

  if (requireCompleteActivity && !startTime) {
    redirectWithWorkError(errorRedirectTo, "invalid");
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
    redirectWithWorkError(errorRedirectTo, "teacher");
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
    redirectWithWorkError(errorRedirectTo, "students");
  }

  if (requireCompleteActivity && selectedStudents.length === 0) {
    redirectWithWorkError(errorRedirectTo, "students");
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

  const errorRedirectTo = readErrorRedirect(
    formData,
    "/admin/work-summary/new-meeting",
  );
  const durationMinutes = readDurationMinutes(formData, errorRedirectTo);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const startTime = readOptionalStartTime(formData.get("startTime"));
  const teacherIds = formData
    .getAll("teacherIds")
    .map((value) => String(value))
    .filter(Boolean);
  const title = String(formData.get("title") ?? "").trim();
  const workDate = readWorkDate(formData, errorRedirectTo);

  if (!title || teacherIds.length === 0) {
    redirectWithWorkError(errorRedirectTo, "teachers");
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
    redirectWithWorkError(errorRedirectTo, "teachers");
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
