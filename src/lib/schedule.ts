import { db } from "@/lib/db";
import { addDays, parseDateOnly, startOfWeek, toDateOnly, today } from "@/lib/dates";
import { ensureLessons } from "@/lib/lessons";
import { nickOf } from "@/lib/person";

export interface PlannerLesson {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  groupId: string;
  groupName: string;
  subject: string;
  teacher: string | null;
  room: string;
}

/** Неделя по параметру ?week=YYYY-MM-DD (любая дата недели), по умолчанию — текущая. */
export function resolveWeek(week?: string | string[]) {
  const raw = Array.isArray(week) ? week[0] : week;
  const base = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? parseDateOnly(raw) : today();
  const start = startOfWeek(base);
  return { start, end: addDays(start, 6), prev: toDateOnly(addDays(start, -7)), next: toDateOnly(addDays(start, 7)) };
}

/**
 * Уроки недели для набора групп. Недостающие уроки сначала создаются из ScheduleSlot,
 * поэтому расписание всегда соответствует слотам.
 */
export async function getWeekLessons(groupIds: string[], start: Date): Promise<PlannerLesson[]> {
  const end = addDays(start, 6);
  await ensureLessons(db, groupIds, start, end);
  const [lessons, slots] = await Promise.all([
    db.lesson.findMany({
      where: { groupId: { in: groupIds }, date: { gte: start, lte: end } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        topic: true,
        group: {
          select: { id: true, name: true, subject: { select: { name: true } }, teacher: { select: { user: { select: { nickname: true, login: true } } } } },
        },
      },
    }),
    db.scheduleSlot.findMany({ where: { groupId: { in: groupIds } }, select: { groupId: true, dayOfWeek: true, startTime: true, room: true } }),
  ]);
  return lessons.map((l) => {
    const dow = l.date.getUTCDay() || 7;
    const slot = slots.find((s) => s.groupId === l.group.id && s.dayOfWeek === dow && s.startTime === l.startTime);
    return {
      id: l.id,
      date: toDateOnly(l.date),
      startTime: l.startTime,
      endTime: l.endTime,
      topic: l.topic,
      groupId: l.group.id,
      groupName: l.group.name,
      subject: l.group.subject.name,
      teacher: l.group.teacher ? nickOf(l.group.teacher.user) : null,
      room: slot?.room ?? "",
    };
  });
}
