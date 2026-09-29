import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeKey, type StorageProvider } from "./types";

/** Локальная папка (для разработки и своего сервера). Файлы: STORAGE_DIR или ./storage */
export class LocalStorage implements StorageProvider {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (!isSafeKey(key)) throw new Error("Недопустимый ключ файла");
    return path.join(this.root, key);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async get(key: string) {
    try {
      return { data: await readFile(this.resolve(key)), contentType: "image/webp" };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
