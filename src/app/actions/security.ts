"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parse } from "@/lib/action-utils";
import { ActionError, requireActionUser, runAction, type ActionResult } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { generateTempPassword } from "@/lib/passwords";
import { idOnlySchema } from "@/lib/validation";

const resolutionSchema = z.object({ id: z.string().trim().min(1).max(64), resolution: z.enum(["OK", "PASSWORD_RESET", "BLOCKED"]) });

function refresh() {
  revalidatePath("/admin", "layout");
}

async function loadOpenAlert(id: string) {
  const alert = await db.securityAlert.findUnique({ where: { id } });
  if (!alert) throw new ActionError(ru.errors.notFound);
  if (alert.status !== "OPEN") throw new ActionError(ru.security.alreadyResolved);
  const user = await db.user.findUnique({ where: { id: alert.userId }, select: { id: true, login: true, nickname: true } });
  return { alert, user };
}

/**
 * Решение администратора по уведомлению «5 неудачных входов»:
 *  OK — «Всё в порядке» (ничего не меняется), PASSWORD_RESET — новый временный пароль,
 *  BLOCKED — аккаунт блокируется ВРУЧНУЮ. Автоматически аккаунты не блокируются никогда.
 */
export async function resolveSecurityAlert(input: { id: string; resolution: string }): Promise<ActionResult<{ password?: string }>> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const data = parse(resolutionSchema, input);
    const { alert, user } = await loadOpenAlert(data.id);
    const label = user?.nickname ?? user?.login ?? alert.login;
    let password: string | undefined;

    if (data.resolution !== "OK") {
      if (!user) throw new ActionError(ru.errors.notFound);
      if (user.id === admin.id) throw new ActionError(data.resolution === "BLOCKED" ? ru.errors.cannotDeactivateSelf : ru.errors.cannotResetSelf);
    }
    if (data.resolution === "PASSWORD_RESET" && user) {
      password = generateTempPassword();
      await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true } });
    }
    if (data.resolution === "BLOCKED" && user) await db.user.update({ where: { id: user.id }, data: { isActive: false } });

    await db.securityAlert.update({ where: { id: alert.id }, data: { status: "RESOLVED", resolution: data.resolution, resolvedById: admin.id, resolvedAt: new Date() } });
    await db.notification.updateMany({ where: { type: "login_alert", link: { contains: alert.id }, readAt: null }, data: { readAt: new Date() } });
    const action = data.resolution === "OK" ? "security_ok" : data.resolution === "BLOCKED" ? "security_blocked" : "security_password_reset";
    await writeAudit(admin, action, { type: "security", id: alert.id, label }, { attempts: alert.attempts });
    // Со временным паролем страницу не обновляем: карточка тревоги исчезла бы вместе с окном, где показан пароль.
    // Окно само обновит страницу при закрытии.
    if (!password) refresh();
    const message = data.resolution === "OK" ? ru.security.doneOk : data.resolution === "BLOCKED" ? ru.security.doneBlocked : ru.security.doneReset;
    return { ok: true, message, data: { password } };
  });
}

/** «Разблокировать» — аккаунт, заблокированный вручную по тревоге, снова может входить. */
export async function unblockFromAlert(alertId: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const { id } = parse(idOnlySchema, { id: alertId });
    const alert = await db.securityAlert.findUnique({ where: { id }, select: { id: true, userId: true, login: true } });
    if (!alert) throw new ActionError(ru.errors.notFound);
    const user = await db.user.findUnique({ where: { id: alert.userId }, select: { id: true, login: true, nickname: true } });
    if (!user) throw new ActionError(ru.errors.notFound);
    await db.user.update({ where: { id: user.id }, data: { isActive: true } });
    await writeAudit(admin, "security_unblocked", { type: "security", id: alert.id, label: user.nickname ?? user.login });
    refresh();
    return { ok: true, message: ru.security.doneUnblocked };
  });
}

/** «Прочитано» для колокольчика текущего администратора. */
export async function markNotificationsRead(): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    await db.notification.updateMany({ where: { userId: admin.id, readAt: null }, data: { readAt: new Date() } });
    refresh();
    return { ok: true };
  });
}
