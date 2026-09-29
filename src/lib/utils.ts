import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Нормализация строки поиска под userSearchKey. */
export function searchTerm(q: string): string {
  return q.trim().toLowerCase().replace(/ё/g, "е");
}
