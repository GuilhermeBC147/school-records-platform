"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function readRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function buildRiskRedirect(formData: FormData) {
  const params = new URLSearchParams();

  for (const key of ["teacherId", "dateFrom", "dateTo", "resolutionStatus"]) {
    const value = readRequiredString(formData, key);

    if (value) {
      params.set(key, value);
    }
  }

  const filterClassId = readRequiredString(formData, "filterClassId");

  if (filterClassId) {
    params.set("classId", filterClassId);
  }

  const query = params.toString();
  return query ? `/admin/risk?${query}` : "/admin/risk";
}

export async function resolveRiskRecordAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const classId = readRequiredString(formData, "classId");
  const studentId = readRequiredString(formData, "studentId");
  const resolvedThroughDateValue = readRequiredString(
    formData,
    "resolvedThroughDate",
  );
  const resolvedThroughDate = new Date(resolvedThroughDateValue);

  if (
    !classId ||
    !studentId ||
    Number.isNaN(resolvedThroughDate.getTime())
  ) {
    redirect(buildRiskRedirect(formData));
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      classId_studentId: {
        classId,
        studentId,
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    redirect(buildRiskRedirect(formData));
  }

  await prisma.$executeRaw`
    INSERT INTO "StudentRiskResolution" (
      "id",
      "classId",
      "studentId",
      "resolvedById",
      "resolvedThroughDate",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${classId},
      ${studentId},
      ${currentUser.id},
      ${resolvedThroughDate},
      ${new Date()}
    )
    ON CONFLICT ("classId", "studentId") DO UPDATE SET
      "resolvedAt" = CURRENT_TIMESTAMP,
      "resolvedById" = EXCLUDED."resolvedById",
      "resolvedThroughDate" = EXCLUDED."resolvedThroughDate",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  redirect(buildRiskRedirect(formData));
}

export async function undoRiskResolutionAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const classId = readRequiredString(formData, "classId");
  const studentId = readRequiredString(formData, "studentId");

  if (!classId || !studentId) {
    redirect(buildRiskRedirect(formData));
  }

  await prisma.studentRiskResolution.deleteMany({
    where: {
      classId,
      studentId,
    },
  });

  redirect(buildRiskRedirect(formData));
}
