/** Общие для клиента и сервера константы фото профиля (без тяжёлых серверных зависимостей). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_SIZE = 512;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Ссылка на фото; версия в адресе сбрасывает кэш браузера при смене фото. */
export function avatarUrl(user: { id: string; avatarKey: string | null; avatarVersion: number }): string | null {
  return user.avatarKey ? `/api/users/${user.id}/avatar?v=${user.avatarVersion}` : null;
}
