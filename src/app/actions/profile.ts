"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { formToObject, isUniqueViolation, parse } from "@/lib/action-utils";
import { ActionError, requireSessionUser, runAction, type ActionResult } from "@/lib/access";
import { parseDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { nicknameStatus } from "@/lib/nickname";
import { fullNameOf, nicknameKey, userSearchKey } from "@/lib/profile";
import { initialPasswordSchema, nicknameOnlySchema, passwordChangeSchema, profileSchema } from "@/lib/validation";

type State = ActionResult<unknown> | null;

async function assertNicknameFree(nickname: string, userId: string) {
  const status = await nicknameStatus(nickname, userId);
  if (!status.available) {
    throw new ActionError(ru.errors.validation, { nickname: status.reason === "taken" ? ru.profile.taken : ru.validation.nickname[status.reason] });
  }
}

/** Сохранить свой профиль. Каждый правит только свой: id берётся из сессии, а не из формы. */
export async function updateOwnProfile(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSessionUser();
    if (user.needsOnboarding) throw new ActionError(ru.errors.finishProfileFirst);
    const data = parse(profileSchema, formToObject(formData));
    await assertNicknameFree(data.nickname, user.id);
    const isStudent = user.role === "STUDENT";
    try {
      await db.user.update({
        where: { id: user.id },
        data: {
          nickname: data.nickname,
          nicknameKey: nicknameKey(data.nickname),
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: fullNameOf(data.firstName, data.lastName),
          searchKey: userSearchKey({ ...data, login: user.login }),
          bio: data.bio,
          phone: data.phone,
          email: data.email,
          birthDate: data.birthDate ? parseDateOnly(data.birthDate) : null,
          // Оформление выбирают только ученики
          ...(isStudent ? { avatarFrame: data.avatarFrame, cardColor: data.cardColor } : {}),
          ...(isStudent && user.studentId ? { student: { update: { showInLeaderboard: data.showInLeaderboard } } } : {}),
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.validation, { nickname: ru.profile.taken });
      throw error;
    }
    revalidatePath("/", "layout");
    return { ok: true, message: ru.profile.saved };
  });
}

/** Сменить свой пароль (нужен текущий). */
export async function changeOwnPassword(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSessionUser();
    if (user.needsOnboarding) throw new ActionError(ru.errors.finishProfileFirst);
    const data = parse(passwordChangeSchema, {
      current: formData.get("current"),
      next: formData.get("next"),
      confirm: formData.get("confirm"),
    });
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await bcrypt.compare(data.current, record.passwordHash))) {
      throw new ActionError(ru.errors.validation, { current: ru.account.wrongCurrent });
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(data.next, 10) } });
    return { ok: true, message: ru.account.changed };
  });
}

/* ---------------- Мастер первого входа ---------------- */

/** Шаг 1: ник. Без revalidate — страница мастера не должна перерисоваться посреди шагов. */
export async function chooseNickname(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = parse(nicknameOnlySchema, { nickname: formData.get("nickname") });
    await assertNicknameFree(data.nickname, user.id);
    try {
      const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, lastName: true } });
      await db.user.update({
        where: { id: user.id },
        data: {
          nickname: data.nickname,
          nicknameKey: nicknameKey(data.nickname),
          searchKey: userSearchKey({ nickname: data.nickname, firstName: record.firstName, lastName: record.lastName, login: user.login }),
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.validation, { nickname: ru.profile.taken });
      throw error;
    }
    return { ok: true };
  });
}

/** Шаг 2: свой пароль вместо временного (текущий вводить не нужно — человек только что вошёл с ним). */
export async function chooseInitialPassword(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = parse(initialPasswordSchema, { next: formData.get("next"), confirm: formData.get("confirm") });
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (await bcrypt.compare(data.next, record.passwordHash)) {
      throw new ActionError(ru.errors.validation, { next: ru.account.temporarySame });
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(data.next, 10), mustChangePassword: false },
    });
    return { ok: true };
  });
}
