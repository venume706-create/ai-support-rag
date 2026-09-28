/**
 * Загружает демо-данные, только если в базе ещё нет пользователей.
 * Используется при автоматическом деплое (vercel-build): повторные сборки
 * не затирают реальные данные.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const users = await db.user.count();
  await db.$disconnect();
  if (users > 0) {
    console.log(`В базе уже есть пользователи (${users}) — сид пропущен.`);
    return;
  }
  console.log("База пустая — загружаю демо-данные.");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
