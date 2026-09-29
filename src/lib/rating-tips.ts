/**
 * Подсказки ученику: что быстрее всего поднимет рейтинг.
 * Каждое «действие» проверяется расчётом: берём реальные данные ученика, добавляем одно событие
 * и смотрим, на сколько вырос итог по тем же формулам (lib/rating.ts).
 */
import { calculateStudentRating, round1, type RatingInput } from "@/lib/rating";

export type TipAction = "grade5" | "attend" | "homework";

export interface Tip {
  action: TipAction;
  /** На сколько баллов вырастет итог (может быть 0, если уже максимум) */
  gain: number;
}

const ACTIONS: Record<TipAction, (input: RatingInput) => RatingInput> = {
  grade5: (i) => ({ ...i, grades: [...i.grades, 5] }),
  attend: (i) => ({ ...i, attendance: [...i.attendance, "PRESENT"] }),
  homework: (i) => ({ ...i, homework: [...i.homework, "DONE"] }),
};

/** Действия по убыванию пользы. Если данных ещё нет совсем — итог появится с первым событием, польза считается от нуля. */
export function ratingTips(input: RatingInput): Tip[] {
  const base = calculateStudentRating(input).total ?? 0;
  return (Object.keys(ACTIONS) as TipAction[])
    .map((action) => {
      const after = calculateStudentRating(ACTIONS[action](input)).total ?? 0;
      return { action, gain: round1(after - base) };
    })
    .sort((a, b) => b.gain - a.gain);
}
