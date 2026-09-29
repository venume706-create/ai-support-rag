/** Хранилище файлов (аватары). Реализации: локальная папка и S3-совместимое облако. */
export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

/** Ключ допустим, только если это «avatars/<id>-<число>.webp»: защита от выхода за пределы папки. */
export function isSafeKey(key: string): boolean {
  return /^avatars\/[A-Za-z0-9_-]{1,64}\.webp$/.test(key);
}
