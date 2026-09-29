import { addDays } from "@/lib/dates";
import type { AttendanceMark } from "@/lib/rating";
import type { SeriesPoint } from "@/lib/rating-history";

/**
 * Посещаемость по неделям: для каждой из последних `weeks` недель (последняя заканчивается сегодня)
 * процент по отметкам за 7 дней. Опоздание = 0.5, «уваж.» не в счёт, как в рейтинге. Нет отметок — null.
 */
export function weeklyAttendanceSeries(marks: { date: Date; status: AttendanceMark }[], today: Date, weeks = 8): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const end = addDays(today, -7 * k);
    const start = addDays(end, -7);
    const inWeek = marks.filter((m) => m.date > start && m.date <= end && m.status !== "EXCUSED");
    if (inWeek.length === 0) {
      points.push({ date: end, total: null });
      continue;
    }
    const score = inWeek.reduce((s, m) => s + (m.status === "PRESENT" ? 1 : m.status === "LATE" ? 0.5 : 0), 0);
    points.push({ date: end, total: Math.round((score / inWeek.length) * 1000) / 10 });
  }
  return points;
}

/** Сколько оценок каждого достоинства (1–5) — для гистограммы. */
export function gradeCounts(values: number[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const v of values) if (v >= 1 && v <= 5 && Number.isInteger(v)) out[v as 1 | 2 | 3 | 4 | 5]++;
  return out;
}

/** Сколько отметок каждого статуса — для кольцевой диаграммы. */
export function attendanceCounts(statuses: AttendanceMark[]): Record<AttendanceMark, number> {
  const out: Record<AttendanceMark, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const s of statuses) out[s]++;
  return out;
}
