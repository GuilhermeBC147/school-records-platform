"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function readRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalString(formData: FormData, key: string) {
  return readRequiredString(formData, key) || null;
}

function readTermNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return currentUser;
}

async function readClassForm(formData: FormData) {
  const name = readRequiredString(formData, "name");
  const book = readOptionalString(formData, "book");
  const semester = readTermNumber(formData, "semester");
  const year = readTermNumber(formData, "year");
  const teacherId = readRequiredString(formData, "teacherId");
  const isActive = formData.get("isActive") === "on";

  if (
    !name ||
    !teacherId ||
    (semester !== null && ![1, 2].includes(semester)) ||
    (year !== null && (year < 2000 || year > 2100))
  ) {
    return null;
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: "TEACHER",
      isActive: true,
    },
    select: { id: true },
  });

  if (!teacher) {
    return null;
  }

  return {
    book,
    isActive,
    name,
    semester,
    teacherId,
    year,
  };
}

export async function createClassAction(formData: FormData) {
  await requireAdmin();

  const classData = await readClassForm(formData);

  if (!classData) {
    redirect("/admin/classes/new?error=invalid");
  }

  await prisma.class.create({
    data: classData,
  });

  redirect("/admin/classes?status=created");
}

export async function updateClassAction(formData: FormData) {
  await requireAdmin();

  const classId = readRequiredString(formData, "classId");
  const classData = await readClassForm(formData);

  if (!classId || !classData) {
    redirect(`/admin/classes/${classId}?error=invalid`);
  }

  const schoolClass = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });

  if (!schoolClass) {
    redirect("/admin/classes");
  }

  await prisma.class.update({
    where: { id: classId },
    data: classData,
  });

  redirect("/admin/classes?status=updated");
}

export async function updateClassRosterAction(formData: FormData) {
  await requireAdmin();

  const classId = readRequiredString(formData, "classId");
  const selectedStudentIds = formData
    .getAll("studentIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!classId) {
    redirect("/admin/classes");
  }

  const [schoolClass, activeStudents] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    }),
    prisma.student.findMany({
      where: {
        id: { in: selectedStudentIds },
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  if (!schoolClass || activeStudents.length !== selectedStudentIds.length) {
    redirect(`/admin/classes/${classId}?error=roster`);
  }

  await prisma.$transaction([
    prisma.enrollment.updateMany({
      where: {
        classId,
        studentId: { notIn: selectedStudentIds },
        status: "ACTIVE",
      },
      data: {
        endDate: new Date(),
        status: "INACTIVE",
      },
    }),
    ...selectedStudentIds.map((studentId) =>
      prisma.enrollment.upsert({
        where: {
          classId_studentId: {
            classId,
            studentId,
          },
        },
        create: {
          classId,
          studentId,
          startDate: new Date(),
          status: "ACTIVE",
        },
        update: {
          endDate: null,
          status: "ACTIVE",
        },
      }),
    ),
  ]);

  redirect(`/admin/classes/${classId}?status=roster-updated`);
}
