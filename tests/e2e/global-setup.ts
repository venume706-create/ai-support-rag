import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * Готовит отдельную тестовую базу prisma/e2e.db: удаляет файл прошлого прогона
 * (он создаётся только тестами), применяет миграции и загружает сид.
 * Рабочая база dev.db не затрагивается.
 */
export default function globalSetup() {
  const file = path.join(__dirname, "..", "..", "prisma", "e2e.db");
  for (const f of [file, `${file}-journal`]) rmSync(f, { force: true });
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
