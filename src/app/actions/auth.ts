"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { ROLE_HOME } from "@/lib/roles";
import { loginSchema } from "@/lib/validation";

export interface LoginState {
  error?: string;
}

function safeCallback(value: FormDataEntryValue | null, fallback: string): string {
  const url = typeof value === "string" ? value : "";
  return url.startsWith(fallback) ? url : fallback;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ login: formData.get("login"), password: formData.get("password") });
  if (!parsed.success) return { error: ru.auth.invalid };

  const user = await db.user.findUnique({ where: { login: parsed.data.login }, select: { role: true } });
  const home = user ? ROLE_HOME[user.role] : "/";
  try {
    await signIn("credentials", {
      login: parsed.data.login,
      password: parsed.data.password,
      redirectTo: safeCallback(formData.get("callbackUrl"), home),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code;
      return { error: code === "inactive" ? ru.auth.inactive : ru.auth.invalid };
    }
    throw error;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
