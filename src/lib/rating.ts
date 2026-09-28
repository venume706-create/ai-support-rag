/**
 * Рейтинг ученика (100 баллов) и рейтинг учителя.
 *
 * Модуль чистый: на вход — уже отобранные данные за нужный период,
 * на выход — баллы. Загрузка из БД — в lib/rating-data.ts.
 */

export const RATING_WEIGHTS = {
  grades: 50,
  attendance: 25,
  homework: 25,
} as const;

export type AttendanceMark = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type HomeworkMark = "DONE" | "PARTIAL" | "NOT_DONE";

export interface RatingInput {
  /** Оценки 1–5 */
  grades: number[];
  /** Отметки посещаемости по урокам */
  attendance: AttendanceMark[];
  /** Статусы по заданиям (невыполненное задание с прошедшим сроком = NOT_DONE) */
  homework: HomeworkMark[];
}

export interface RatingPart {
  /** Баллы за часть или null, если данных нет */
  points: number | null;
  max: number;
  /** Доля 0..1 или null */
  ratio: number | null;
}

export interface StudentRating {
  /** Итог 0..100 (округление до 0.1) или null, если данных нет совсем */
  total: number | null;
  grades: RatingPart & { average: number | null; count: number };
  attendance: RatingPart & { counted: number };
  homework: RatingPart & { count: number };
}

export type RatingLevel = "high" | "medium" | "low" | "none";

export function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function part(ratio: number | null, max: number): RatingPart {
  return { ratio, max, points: ratio === null ? null : round1(ratio * max) };
}

export function gradesRatio(grades: number[]): { ratio: number | null; average: number | null } {
  const valid = grades.filter((g) => Number.isFinite(g) && g >= 1 && g <= 5);
  if (valid.length === 0) return { ratio: null, average: null };
  const average = valid.reduce((s, g) => s + g, 0) / valid.length;
  return { ratio: average / 5, average: Math.round(average * 100) / 100 };
}

export function attendanceRatio(marks: AttendanceMark[]): { ratio: number | null; counted: number } {
  const counted = marks.filter((m) => m !== "EXCUSED").length;
  if (counted === 0) return { ratio: null, counted: 0 };
  const present = marks.filter((m) => m === "PRESENT").length;
  const late = marks.filter((m) => m === "LATE").length;
  return { ratio: (present + late * 0.5) / counted, counted };
}

export function homeworkRatio(marks: HomeworkMark[]): { ratio: number | null; count: number } {
  if (marks.length === 0) return { ratio: null, count: 0 };
  const done = marks.filter((m) => m === "DONE").length;
  const partial = marks.filter((m) => m === "PARTIAL").length;
  return { ratio: (done + partial * 0.5) / marks.length, count: marks.length };
}

/**
 * Итог = сумма баллов доступных частей, масштабированная к 100:
 *   total = Σ points / Σ max(доступных частей) × 100.
 * Если доступны все три части, это просто сумма баллов.
 */
export function calculateStudentRating(input: RatingInput): StudentRating {
  const g = gradesRatio(input.grades);
  const a = attendanceRatio(input.attendance);
  const h = homeworkRatio(input.homework);

  const grades = { ...part(g.ratio, RATING_WEIGHTS.grades), average: g.average, count: input.grades.length };
  const attendance = { ...part(a.ratio, RATING_WEIGHTS.attendance), counted: a.counted };
  const homework = { ...part(h.ratio, RATING_WEIGHTS.homework), count: h.count };

  let earned = 0;
  let available = 0;
  for (const [ratio, max] of [
    [g.ratio, RATING_WEIGHTS.grades],
    [a.ratio, RATING_WEIGHTS.attendance],
    [h.ratio, RATING_WEIGHTS.homework],
  ] as const) {
    if (ratio === null) continue;
    earned += ratio * max;
    available += max;
  }

  const total = available === 0 ? null : round1((earned / available) * 100);
  return { total, grades, attendance, homework };
}

/** Рейтинг учителя — средний рейтинг его учеников, у которых есть данные. */
export function calculateTeacherRating(studentTotals: Array<number | null>): {
  rating: number | null;
  studentsCounted: number;
} {
  const valid = studentTotals.filter((t): t is number => t !== null && Number.isFinite(t));
  if (valid.length === 0) return { rating: null, studentsCounted: 0 };
  return {
    rating: round1(valid.reduce((s, t) => s + t, 0) / valid.length),
    studentsCounted: valid.length,
  };
}

export function ratingLevel(value: number | null): RatingLevel {
  if (value === null) return "none";
  if (value >= 80) return "high";
  if (value >= 50) return "medium";
  return "low";
}
