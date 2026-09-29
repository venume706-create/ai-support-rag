import { cache } from "react";
import { forbidden, notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { Prisma, type Role } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";

export interface CurrentUser {
  id: string;
  login: string;
  /** Главное имя: ник, а пока его нет — логин */
  nick: string;
  nickname: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  teacherId: string | null;
  studentId: string | null;
  avatarKey: string | null;
  avatarVersion: number;
  avatarFrame: string;
  cardColor: string;
  /** Пароль ещё временный (выдан администратором) */
  mustChangePassword: boolean;
  /** Нужен мастер первого входа: нет ника или пароль ещё временный */
  needsOnboarding: boolean;
}

/**
 * Текущий пользователь из сессии, сверенный с БД на каждый запрос:
 * удалённый или отключённый (isActive=false) пользователь считается неавторизованным.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      login: true,
      nickname: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true,
      isActive: true,
      avatarKey: true,
      avatarVersion: true,
      avatarFrame: true,
      cardColor: true,
      mustChangePassword: true,
      teacher: { select: { id: true } },
      student: { select: { id: true } },
    },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    login: user.login,
    nick: user.nickname ?? user.login,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    teacherId: user.teacher?.id ?? null,
    studentId: user.student?.id ?? null,
    avatarKey: user.avatarKey,
    avatarVersion: user.avatarVersion,
    avatarFrame: user.avatarFrame,
    cardColor: user.cardColor,
    mustChangePassword: user.mustChangePassword,
    needsOnboarding: user.mustChangePassword || !user.nickname,
  };
});

/** Для страниц: нет входа → /login, не прошёл мастер → /welcome, чужая роль → 403. */
export async function requirePageUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.needsOnboarding) redirect("/welcome");
  if (roles.length && !roles.includes(user.role)) forbidden();
  return user;
}

/** Страница мастера первого входа: нужен только вход, без требования завершённого профиля. */
export async function requireOnboardingPageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function canAccessGroup(user: CurrentUser, groupId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "TEACHER") {
    if (!user.teacherId) return false;
    const group = await db.group.findFirst({ where: { id: groupId, teacherId: user.teacherId }, select: { id: true } });
    return Boolean(group);
  }
  if (!user.studentId) return false;
  const link = await db.groupStudent.findUnique({
    where: { groupId_studentId: { groupId, studentId: user.studentId } },
    select: { id: true },
  });
  return Boolean(link);
}

export async function canAccessStudent(user: CurrentUser, studentId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "STUDENT") return user.studentId === studentId;
  if (!user.teacherId) return false;
  const link = await db.groupStudent.findFirst({
    where: { studentId, group: { teacherId: user.teacherId } },
    select: { id: true },
  });
  return Boolean(link);
}

/** Для страниц: запись не существует → 404, нет прав → 403. */
export async function requireGroupPage(user: CurrentUser, groupId: string) {
  const exists = await db.group.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!exists) notFound();
  if (!(await canAccessGroup(user, groupId))) forbidden();
}

export async function requireStudentPage(user: CurrentUser, studentId: string) {
  const exists = await db.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!exists) notFound();
  if (!(await canAccessStudent(user, studentId))) forbidden();
}

/* ---------- Server actions ---------- */

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export class ActionError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function requireActionUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionError(ru.errors.unauthorized);
  if (user.needsOnboarding) throw new ActionError(ru.errors.finishProfileFirst);
  if (roles.length && !roles.includes(user.role)) throw new ActionError(ru.errors.forbidden);
  return user;
}

/** Действия мастера первого входа и профиля: достаточно быть вошедшим. */
export async function requireSessionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionError(ru.errors.unauthorized);
  return user;
}

export async function assertGroupAction(user: CurrentUser, groupId: string) {
  if (!(await canAccessGroup(user, groupId))) throw new ActionError(ru.errors.forbidden);
}

/** Единая обработка ошибок server action: права, валидация, уникальность. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return { ok: false, error: ru.errors.notFound };
    }
    console.error(error);
    return { ok: false, error: ru.errors.generic };
  }
}

/* ---------- API routes ---------- */

export async function apiUser(...roles: Role[]): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: ru.errors.unauthorized }, { status: 401 });
  if (user.needsOnboarding) return NextResponse.json({ error: ru.errors.finishProfileFirst }, { status: 403 });
  if (roles.length && !roles.includes(user.role)) return NextResponse.json({ error: ru.errors.forbidden }, { status: 403 });
  return user;
}

/** API профиля и мастера: достаточно быть вошедшим. */
export async function apiSession(): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: ru.errors.unauthorized }, { status: 401 });
  return user;
}

export function apiForbidden() {
  return NextResponse.json({ error: ru.errors.forbidden }, { status: 403 });
}

export function apiNotFound() {
  return NextResponse.json({ error: ru.errors.notFound }, { status: 404 });
}
