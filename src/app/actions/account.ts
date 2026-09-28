"use server";

import bcrypt from "bcryptjs";
import { ActionError, requireActionUser, runAction, type ActionResult } from "@/lib/access";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { fieldErrors, passwordChangeSchema } from "@/lib/validation";

/** Смена собственного пароля (любая роль). Требует текущий пароль. */
export async function changeOwnPassword(_prev: ActionResult<unknown> | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const parsed = passwordChangeSchema.safeParse({
      current: formData.get("current"),
      next: formData.get("next"),
      confirm: formData.get("confirm"),
    });
    if (!parsed.success) throw new ActionError(ru.errors.validation, fieldErrors(parsed.error));
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await bcrypt.compare(parsed.data.current, record.passwordHash))) {
      throw new ActionError(ru.errors.validation, { current: ru.account.wrongCurrent });
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) } });
    return { ok: true, message: ru.account.changed };
  });
}
