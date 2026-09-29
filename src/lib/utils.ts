import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Нормализация строки поиска под userSearchKey.
 * «%» вырезается: в ников, имён и логинов его не бывает, а в LIKE он означает «что угодно».
 * «_» оставлен, он бывает в никах; в поиске он заменяет один любой символ, что безвредно.
 */
export function searchTerm(q: string): string {
  return q.trim().toLowerCase().replace(/ё/g, "е").replace(/%/g, "");
}

/** Склонение по числу: plural(1, "балл", "балла", "баллов"). Дробные числа — «балла». */
export function plural(n: number, one: string, few: string, many: string): string {
  if (!Number.isInteger(n)) return few;
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Число баллов с правильным словом: «1 балл», «3.6 балла», «5 баллов». */
export function points(n: number): string {
  return `${n} ${plural(n, "балл", "балла", "баллов")}`;
}
