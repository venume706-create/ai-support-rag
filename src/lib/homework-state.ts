import type { HomeworkStatus } from "@prisma/client";

export type HomeworkState = "done" | "partial" | "overdue" | "today" | "soon" | "later";

const DAY = 86_400_000;

/** Сколько дней до срока (0 — сегодня, отрицательное — просрочено). Даты — полночь UTC календарного дня. */
export function daysUntil(due: Date, now: Date): number {
  return Math.round((due.getTime() - now.getTime()) / DAY);
}

/**
 * Состояние задания для ученика: отметка учителя главнее срока;
 * без отметки — по сроку (просрочено, сегодня, скоро — в ближайшие 3 дня, позже).
 */
export function homeworkState(due: Date, now: Date, status?: HomeworkStatus | null): { state: HomeworkState; daysLeft: number } {
  const daysLeft = daysUntil(due, now);
  if (status === "DONE") return { state: "done", daysLeft };
  if (status === "PARTIAL") return { state: "partial", daysLeft };
  if (status === "NOT_DONE" || daysLeft < 0) return { state: "overdue", daysLeft };
  if (daysLeft === 0) return { state: "today", daysLeft };
  if (daysLeft <= 3) return { state: "soon", daysLeft };
  return { state: "later", daysLeft };
}
