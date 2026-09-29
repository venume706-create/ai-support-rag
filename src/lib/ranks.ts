/**
 * Ранги ученика по итоговым баллам (0–100). Названия — в lib/i18n/ru.ts (ru.ranks).
 * Порог — минимальный балл, с которого ранг присваивается.
 */
export const RANKS = [
  { index: 0, code: "novice", min: 0 },
  { index: 1, code: "student", min: 30 },
  { index: 2, code: "advanced", min: 50 },
  { index: 3, code: "honor", min: 70 },
  { index: 4, code: "master", min: 85 },
  { index: 5, code: "legend", min: 95 },
] as const;

export type Rank = (typeof RANKS)[number];
export type RankCode = Rank["code"];

/** Ранг по баллам; пока данных нет (null) — «Новичок». */
export function rankOf(total: number | null): Rank {
  if (total === null) return RANKS[0];
  let current: Rank = RANKS[0];
  for (const rank of RANKS) if (total >= rank.min) current = rank;
  return current;
}

export function nextRank(total: number | null): Rank | null {
  return RANKS[rankOf(total).index + 1] ?? null;
}

/** Сколько баллов не хватает до следующего ранга (округлено вверх до 0.1); null — ранг уже высший. */
export function pointsToNext(total: number | null): number | null {
  const next = nextRank(total);
  if (!next) return null;
  return Math.ceil((next.min - (total ?? 0)) * 10 - 1e-9) / 10;
}

/** Прогресс внутри текущего ранга, 0..1 (для шкалы до следующего). */
export function rankProgress(total: number | null): number {
  const current = rankOf(total);
  const next = nextRank(total);
  if (!next) return 1;
  return Math.min(1, Math.max(0, ((total ?? 0) - current.min) / (next.min - current.min)));
}
