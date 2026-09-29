/**
 * Профиль пользователя: ник, имя, ключи поиска.
 * Чистые функции — используются и в сиде, и в server actions, и в тестах.
 */

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;

/** Ник: буквы (любой алфавит), цифры, точка, дефис, подчёркивание; без пробелов. */
export const NICKNAME_PATTERN = /^[\p{L}\p{N}_.-]+$/u;

/** Ключ уникальности ника: регистр и «ё/е» не различаются. */
export function nicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/ё/g, "е");
}

export type NicknameProblem = "short" | "long" | "chars";

export function checkNicknameFormat(nickname: string): NicknameProblem | null {
  const n = nickname.trim();
  if ([...n].length < NICKNAME_MIN) return "short";
  if ([...n].length > NICKNAME_MAX) return "long";
  if (!NICKNAME_PATTERN.test(n)) return "chars";
  return null;
}

export function fullNameOf(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

/** Что показывать главным именем: ник, а пока его нет — логин. */
export function displayNick(user: { nickname: string | null; login: string }): string {
  return user.nickname ?? user.login;
}

/** Ключ поиска: ник, имя, фамилия и логин в нижнем регистре (ё → е). */
export function userSearchKey(parts: { nickname?: string | null; firstName: string; lastName: string; login: string }): string {
  return [parts.nickname ?? "", parts.firstName, parts.lastName, parts.login]
    .join(" ")
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim();
}
