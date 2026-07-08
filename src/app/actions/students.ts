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

export async function createStudentAction(formData: FormData) {
  await requireAdmin();

  const fullName = readRequiredString(formData, "fullName");
  const enrollmentIdentifier = readOptionalString(
    formData,
    "enrollmentIdentifier",
  );
  const isActive = formData.get("isActive") === "on";

  if (!fullName) {
    redirect("/admin/students/new?error=invalid");
  }

  if (
    enrollmentIdentifier &&
    (await prisma.student.findUnique({ where: { enrollmentIdentifier } }))
  ) {
    redirect("/admin/students/new?error=duplicate");
  }

  await prisma.student.create({
    data: {
      enrollmentIdentifier,
      fullName,
      isActive,
    },
  });

  redirect("/admin/students?status=created");
}

export async function updateStudentAction(formData: FormData) {
  await requireAdmin();

  const studentId = readRequiredString(formData, "studentId");
  const fullName = readRequiredString(formData, "fullName");
  const enrollmentIdentifier = readOptionalString(
    formData,
    "enrollmentIdentifier",
  );
  const isActive = formData.get("isActive") === "on";

  if (!studentId || !fullName) {
    redirect(`/admin/students/${studentId}?error=invalid`);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    redirect("/admin/students");
  }

  if (enrollmentIdentifier) {
    const duplicate = await prisma.student.findUnique({
      where: { enrollmentIdentifier },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== studentId) {
      redirect(`/admin/students/${studentId}?error=duplicate`);
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      enrollmentIdentifier,
      fullName,
      isActive,
    },
  });

  redirect("/admin/students?status=updated");
}
