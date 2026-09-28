import { Prisma, type PrismaClient } from "@prisma/client";
import { addDays, isoDayOfWeek } from "./dates";

interface SlotLike {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface PlannedLesson {
  groupId: string;
  date: Date;
  startTime: string;
  endTime: string;
}

/** Все уроки, которые дают слоты расписания в диапазоне дат [from, to] включительно. */
export function planLessons(slots: SlotLike[], from: Date, to: Date): PlannedLesson[] {
  const result: PlannedLesson[] = [];
  for (let d = from; d.getTime() <= to.getTime(); d = addDays(d, 1)) {
    const dow = isoDayOfWeek(d);
    for (const slot of slots) {
      if (slot.dayOfWeek === dow) {
        result.push({ groupId: slot.groupId, date: d, startTime: slot.startTime, endTime: slot.endTime });
      }
    }
  }
  return result;
}

/**
 * Создаёт недостающие уроки из ScheduleSlot для групп в диапазоне дат.
 * Уже существующие уроки (та же группа, дата и время начала) не трогаются.
 */
export async function ensureLessons(
  db: PrismaClient,
  groupIds: string[],
  from: Date,
  to: Date,
): Promise<number> {
  if (groupIds.length === 0) return 0;
  const slots = await db.scheduleSlot.findMany({ where: { groupId: { in: groupIds } } });
  const planned = planLessons(slots, from, to);
  if (planned.length === 0) return 0;
  const existing = await db.lesson.findMany({
    where: { groupId: { in: groupIds }, date: { gte: from, lte: to } },
    select: { groupId: true, date: true, startTime: true },
  });
  const key = (l: { groupId: string; date: Date; startTime: string }) =>
    `${l.groupId}|${l.date.getTime()}|${l.startTime}`;
  const have = new Set(existing.map(key));
  const missing = planned.filter((p) => !have.has(key(p)));
  for (const lesson of missing) {
    try {
      await db.lesson.upsert({
        where: { groupId_date_startTime: { groupId: lesson.groupId, date: lesson.date, startTime: lesson.startTime } },
        update: {},
        create: lesson,
      });
    } catch (error) {
      // Параллельный запрос уже создал этот урок — это нормально
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  return missing.length;
}
