import path from "node:path";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageProvider } from "./types";

let instance: StorageProvider | undefined;

/** Выбирает хранилище по STORAGE_DRIVER: «local» (по умолчанию) или «s3». */
export function createStorage(env: Record<string, string | undefined> = process.env): StorageProvider {
  const driver = env.STORAGE_DRIVER || "local";
  if (driver === "s3") {
    const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
    if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error("Для STORAGE_DRIVER=s3 задайте S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID и S3_SECRET_ACCESS_KEY");
    }
    return new S3Storage(S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, env.S3_REGION || "auto");
  }
  if (driver !== "local") throw new Error(`Неизвестный STORAGE_DRIVER: ${driver}`);
  return new LocalStorage(path.resolve(/* turbopackIgnore: true */ env.STORAGE_DIR || "storage"));
}

export function getStorage(): StorageProvider {
  return (instance ??= createStorage());
}

export type { StorageProvider } from "./types";
