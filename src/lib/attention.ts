import type { AttendanceMark, HomeworkMark } from "@/lib/rating";

export type AttentionCode = "lowRating" | "absences" | "homework" | "grades";

export interface AttentionInput {
  /** Общий рейтинг, null — данных нет */
  rating: number | null;
  /** Отметки посещаемости, от новых к старым */
  attendance: AttendanceMark[];
  /** Статусы заданий, от новых к старым (по сроку) */
  homework: HomeworkMark[];
  /** Оценки, от новых к старым */
  grades: number[];
}

export interface AttentionReason {
  code: AttentionCode;
  /** Число для фразы: рейтинг, пропусков подряд, невыполненных, средняя оценка */
  value: number;
}

export const ATTENTION_LOW_RATING = 50;

/**
 * Почему ученику нужно внимание учителя:
 *  - рейтинг ниже 50;
 *  - 2 и более пропуска подряд (уважительные не в счёт и серию не рвут);
 *  - из трёх последних заданий не сделаны два и больше;
 *  - средняя из трёх последних оценок ниже 3 (нужно хотя бы две оценки).
 */
export function attentionReasons(input: AttentionInput): AttentionReason[] {
  const out: AttentionReason[] = [];
  if (input.rating !== null && input.rating < ATTENTION_LOW_RATING) out.push({ code: "lowRating", value: input.rating });

  let streak = 0;
  for (const mark of input.attendance) {
    if (mark === "EXCUSED") continue;
    if (mark === "ABSENT") streak += 1;
    else break;
  }
  if (streak >= 2) out.push({ code: "absences", value: streak });

  const notDone = input.homework.slice(0, 3).filter((m) => m === "NOT_DONE").length;
  if (notDone >= 2) out.push({ code: "homework", value: notDone });

  const lastGrades = input.grades.slice(0, 3);
  if (lastGrades.length >= 2) {
    const avg = lastGrades.reduce((s, g) => s + g, 0) / lastGrades.length;
    if (avg < 3) out.push({ code: "grades", value: Math.round(avg * 10) / 10 });
  }
  return out;
}
