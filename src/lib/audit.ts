import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/access";

export interface AuditTarget {
  type: "user" | "group" | "subject" | "slot" | "membership" | "security" | "system";
  id?: string;
  label?: string;
}

/**
 * Запись в журнал действий. Не должна ломать основное действие: ошибка записи логируется,
 * но не пробрасывается.
 */
export async function writeAudit(
  actor: Pick<CurrentUser, "id" | "nick"> | null,
  action: string,
  target: AuditTarget,
  details?: Record<string, unknown> | string,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorLabel: actor?.nick ?? "система",
        action,
        targetType: target.type,
        targetId: target.id ?? "",
        targetLabel: target.label ?? "",
        details: typeof details === "string" ? details : details ? JSON.stringify(details) : "",
      },
    });
  } catch (error) {
    console.error("Не удалось записать в журнал действий", error);
  }
}

/** Что изменилось: список полей (значения контактов и дат рождения в журнал не пишем). */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  secret: ReadonlyArray<keyof T> = [],
): Record<string, [unknown, unknown] | "изменено"> {
  const out: Record<string, [unknown, unknown] | "изменено"> = {};
  for (const key of Object.keys(after) as Array<keyof T>) {
    if (String(before[key] ?? "") === String(after[key] ?? "")) continue;
    out[String(key)] = secret.includes(key) ? "изменено" : [before[key], after[key]];
  }
  return out;
}
