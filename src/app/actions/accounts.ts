"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_MINUTES = 30;

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

function normalizeEmail(formData: FormData) {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

function readRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

export async function requestPasswordResetAction(formData: FormData) {
  const email = normalizeEmail(formData);

  if (!email) {
    redirect("/forgot-password?status=sent");
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    redirect("/forgot-password?status=sent");
  }

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashResetToken(token),
      expiresAt,
      userId: user.id,
    },
  });

  const params = new URLSearchParams({ status: "sent" });

  if (process.env.NODE_ENV !== "production") {
    params.set("token", token);
  }

  redirect(`/forgot-password?${params.toString()}`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = readRequiredString(formData, "token");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !password || password.length < 8 || password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=invalid`);
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashResetToken(token),
    },
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
      userId: true,
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() < Date.now()
  ) {
    redirect("/reset-password?error=expired");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=success");
}

export async function createTeacherAction(formData: FormData) {
  await requireAdmin();

  const name = readRequiredString(formData, "name");
  const email = normalizeEmail(formData);
  const password = String(formData.get("password") ?? "");
  const isActive = formData.get("isActive") === "on";

  if (!name || !email || password.length < 8) {
    redirect("/admin/teachers/new?error=invalid");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/admin/teachers/new?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "TEACHER",
      isActive,
    },
  });

  redirect("/admin/teachers?status=created");
}

export async function updateTeacherAction(formData: FormData) {
  const currentUser = await requireAdmin();

  const teacherId = readRequiredString(formData, "teacherId");
  const name = readRequiredString(formData, "name");
  const email = normalizeEmail(formData);
  const password = String(formData.get("password") ?? "");
  const isActive = formData.get("isActive") === "on";

  if (!teacherId || !name || !email || (password && password.length < 8)) {
    redirect(`/admin/teachers/${teacherId}?error=invalid`);
  }

  if (teacherId === currentUser.id && !isActive) {
    redirect(`/admin/teachers/${teacherId}?error=self`);
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: "TEACHER",
    },
    select: {
      id: true,
    },
  });

  if (!teacher) {
    redirect("/admin/teachers");
  }

  const duplicateUser = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: teacherId },
    },
    select: { id: true },
  });

  if (duplicateUser) {
    redirect(`/admin/teachers/${teacherId}?error=duplicate`);
  }

  await prisma.user.update({
    where: { id: teacherId },
    data: {
      name,
      email,
      isActive,
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    },
  });

  redirect("/admin/teachers?status=updated");
}
