"use server";

import { redirect } from "next/navigation";
import { normalizeAccountLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = normalizeAccountLocale(formData.get("locale"));
  const loginErrorUrl = (error: string) => `/login?locale=${locale}&error=${error}`;

  if (!email || !password) {
    redirect(loginErrorUrl("missing"));
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(loginErrorUrl("invalid"));
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
