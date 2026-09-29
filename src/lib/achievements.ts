/** Достижения: правила выдачи (чистые функции). Выдача в БД — lib/achievements-data.ts. */
import { addDays } from "@/lib/dates";
import type { AttendanceMark, HomeworkMark } from "@/lib/rating";

export const ACHIEVEMENT_CODES = [
  "first_five",
  "five_streak",
  "no_absence_month",
  "perfect_attendance",
  "homework_all",
  "homework_three",
  "podium",
  "rising_star",
] as const;

export type AchievementCode = (typeof ACHIEVEMENT_CODES)[number];

export interface AchievementInput {
  today: Date;
  /** Оценки по порядку выставления (старые первыми) */
  grades: { date: Date; value: number }[];
  attendance: { date: Date; status: AttendanceMark }[];
  homework: { dueDate: Date; status: HomeworkMark | null }[];
  /** Лучшее место среди групп ученика; null — нет данных */
  bestPlace: number | null;
  weeklyDelta: number | null;
}

const MIN_MARKS_MONTH = 4;
const MIN_MARKS_ALL = 10;

function countedMarks(marks: { status: AttendanceMark }[]) {
  return marks.filter((m) => m.status !== "EXCUSED");
}

/** Какие достижения ученик заслужил на данный момент. */
export function evaluateAchievements(input: AchievementInput): AchievementCode[] {
  const earned: AchievementCode[] = [];

  // Оценки
  if (input.grades.some((g) => g.value === 5)) earned.push("first_five");
  let streak = 0;
  let best = 0;
  for (const g of input.grades) {
    streak = g.value === 5 ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  if (best >= 5) earned.push("five_streak");

  // Посещаемость
  const monthAgo = addDays(input.today, -30);
  const month = countedMarks(input.attendance.filter((a) => a.date > monthAgo && a.date <= input.today));
  if (month.length >= MIN_MARKS_MONTH && month.every((m) => m.status !== "ABSENT")) earned.push("no_absence_month");
  const all = countedMarks(input.attendance.filter((a) => a.date <= input.today));
  if (all.length >= MIN_MARKS_ALL && all.every((m) => m.status !== "ABSENT")) earned.push("perfect_attendance");

  // Домашние задания: считаются те, чей срок прошёл (без отметки — не выполнено) или уже отмеченные
  const due = input.homework
    .filter((h) => h.status !== null || h.dueDate < input.today)
    .map((h) => ({ dueDate: h.dueDate, status: h.status ?? ("NOT_DONE" as HomeworkMark) }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  if (due.length >= 3 && due.every((h) => h.status === "DONE")) earned.push("homework_all");
  if (due.length >= 3 && due.slice(-3).every((h) => h.status === "DONE")) earned.push("homework_three");

  // Соревновательные
  if (input.bestPlace !== null && input.bestPlace <= 3) earned.push("podium");
  if (input.weeklyDelta !== null && input.weeklyDelta >= 5) earned.push("rising_star");
  return earned;
}
