"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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

async function updateSubstitutionStatus(
  formData: FormData,
  substitutionStatus: "APPROVED" | "REJECTED",
) {
  const currentUser = await requireAdmin();
  const lessonId = String(formData.get("lessonId") ?? "");

  if (!lessonId) {
    throw new Error("Lesson is required.");
  }

  await prisma.lesson.update({
    where: {
      id: lessonId,
    },
    data: {
      substitutionReviewedAt: new Date(),
      substitutionReviewedById: currentUser.id,
      substitutionStatus,
    },
  });

  redirect("/admin/substitutions");
}

export async function approveSubstitutionAction(formData: FormData) {
  await updateSubstitutionStatus(formData, "APPROVED");
}

export async function rejectSubstitutionAction(formData: FormData) {
  await updateSubstitutionStatus(formData, "REJECTED");
}

export async function undoSubstitutionApprovalAction(formData: FormData) {
  await requireAdmin();
  const lessonId = String(formData.get("lessonId") ?? "");

  if (!lessonId) {
    throw new Error("Lesson is required.");
  }

  await prisma.lesson.update({
    where: {
      id: lessonId,
    },
    data: {
      substitutionReviewedAt: null,
      substitutionReviewedById: null,
      substitutionStatus: "PENDING_APPROVAL",
    },
  });

  redirect("/admin/substitutions");
}
