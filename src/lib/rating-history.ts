/**
 * История рейтинга: каким был рейтинг ученика на любую дату в прошлом.
 * Из этого считаются динамика («+3.5 за неделю») и график за 8 недель.
 * Формулы баллов — те же, что в lib/rating.ts (50/25/25), здесь только отбор данных по дате.
 */
import { addDays } from "@/lib/dates";
import { calculateStudentRating, type AttendanceMark, type HomeworkMark, type RatingInput, type StudentRating } from "@/lib/rating";

export interface RatingRecords {
  grades: { date: Date; value: number }[];
  attendance: { date: Date; status: AttendanceMark }[];
  /** status = null — отметки нет (просроченное неотмеченное задание считается «не выполнено») */
  homework: { dueDate: Date; status: HomeworkMark | null }[];
}

/**
 * Рейтинг «на дату». Правила отбора те же, что у текущего рейтинга:
 * оценки и уроки — не позже даты; ДЗ — со сроком раньше даты (без отметки = «не выполнено»)
 * или уже отмеченные. includeFutureMarked=true — учитывать и отмеченные ДЗ со сроком в будущем
 * (так считается текущий рейтинг); для прошлых дат — нет, задания ещё не были сроком.
 */
export function inputAsOf(records: RatingRecords, asOf: Date, options: { includeFutureMarked?: boolean } = {}): RatingInput {
  const t = asOf.getTime();
  const homework: HomeworkMark[] = [];
  for (const h of records.homework) {
    const due = h.dueDate.getTime();
    if (h.status) {
      if (due <= t || options.includeFutureMarked) homework.push(h.status);
    } else if (due < t) {
      homework.push("NOT_DONE");
    }
  }
  return {
    grades: records.grades.filter((g) => g.date.getTime() <= t).map((g) => g.value),
    attendance: records.attendance.filter((a) => a.date.getTime() <= t).map((a) => a.status),
    homework,
  };
}

export function ratingAsOf(records: RatingRecords, asOf: Date, options: { includeFutureMarked?: boolean } = {}): StudentRating {
  return calculateStudentRating(inputAsOf(records, asOf, options));
}

export interface SeriesPoint {
  date: Date;
  total: number | null;
}

/** Рейтинг на конец каждой из последних `weeks` недель (последняя точка — сегодня). */
export function weeklySeries(records: RatingRecords, today: Date, weeks = 8): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const date = addDays(today, -7 * k);
    points.push({ date, total: ratingAsOf(records, date, { includeFutureMarked: k === 0 }).total });
  }
  return points;
}

/** Изменение рейтинга за неделю: сейчас минус 7 дней назад. null, если тогда данных не было. */
export function weeklyDelta(records: RatingRecords, today: Date): number | null {
  const now = ratingAsOf(records, today, { includeFutureMarked: true }).total;
  const before = ratingAsOf(records, addDays(today, -7)).total;
  if (now === null || before === null) return null;
  return Math.round((now - before) * 10) / 10;
}
