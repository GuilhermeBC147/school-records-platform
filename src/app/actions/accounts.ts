"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { normalizeAccountDateFormat } from "@/lib/date-format";
import { defaultAccountLocale, normalizeAccountLocale } from "@/lib/locale";
import { hashPassword, verifyPassword } from "@/lib/password";
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

function readAccountRole(formData: FormData) {
  const role = readRequiredString(formData, "role");

  if (role !== "TEACHER" && role !== "RECEPTION") {
    return null;
  }

  return role as UserRole;
}

function readSafeRedirectPath(value: FormDataEntryValue | null) {
  const redirectTo = String(value ?? "");

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/dashboard/account";
  }

  const url = new URL(redirectTo, "http://local");
  url.searchParams.set("locale", "updated");

  return `${url.pathname}${url.search}${url.hash}`;
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

export async function changeOwnPasswordAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (
    !currentPassword ||
    newPassword.length < 8 ||
    newPassword !== confirmPassword
  ) {
    redirect("/dashboard/account?password=invalid");
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    redirect("/dashboard/account?password=current");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  redirect("/dashboard/account?password=updated");
}

export async function updateOwnDateFormatAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      dateFormat: normalizeAccountDateFormat(formData.get("dateFormat")),
    },
  });

  redirect("/dashboard/account?dateFormat=updated");
}

export async function updateOwnLocaleAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      locale: normalizeAccountLocale(formData.get("locale")),
    },
  });

  redirect(readSafeRedirectPath(formData.get("redirectTo")));
}

export async function createAccountAction(formData: FormData) {
  await requireAdmin();

  const name = readRequiredString(formData, "name");
  const email = normalizeEmail(formData);
  const password = String(formData.get("password") ?? "");
  const role = readAccountRole(formData);
  const isActive = formData.get("isActive") === "on";

  if (!name || !email || password.length < 8 || !role) {
    redirect("/admin/manage-accounts/new?error=invalid");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/admin/manage-accounts/new?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      locale: defaultAccountLocale,
      isActive,
    },
  });

  redirect("/admin/manage-accounts?status=created");
}

export async function updateAccountAction(formData: FormData) {
  const currentUser = await requireAdmin();

  const accountId = readRequiredString(formData, "accountId");
  const name = readRequiredString(formData, "name");
  const email = normalizeEmail(formData);
  const password = String(formData.get("password") ?? "");
  const role = readAccountRole(formData);
  const isActive = formData.get("isActive") === "on";

  if (!accountId || !name || !email || !role || (password && password.length < 8)) {
    redirect(`/admin/manage-accounts/${accountId}?error=invalid`);
  }

  if (accountId === currentUser.id && !isActive) {
    redirect(`/admin/manage-accounts/${accountId}?error=self`);
  }

  const account = await prisma.user.findFirst({
    where: {
      id: accountId,
      role: { in: ["TEACHER", "RECEPTION"] },
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    redirect("/admin/manage-accounts");
  }

  const duplicateUser = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: accountId },
    },
    select: { id: true },
  });

  if (duplicateUser) {
    redirect(`/admin/manage-accounts/${accountId}?error=duplicate`);
  }

  await prisma.user.update({
    where: { id: accountId },
    data: {
      name,
      email,
      role,
      isActive,
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    },
  });

  redirect("/admin/manage-accounts?status=updated");
}

export const createTeacherAction = createAccountAction;
export const updateTeacherAction = updateAccountAction;
