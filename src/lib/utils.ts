import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ключ поиска пользователя: ФИО и логин в нижнем регистре. */
export function userSearchKey(fullName: string, login: string): string {
  return `${fullName} ${login}`.toLowerCase().replace(/ё/g, "е");
}

/** Нормализация строки поиска под userSearchKey. */
export function searchTerm(q: string): string {
  return q.trim().toLowerCase().replace(/ё/g, "е");
}
