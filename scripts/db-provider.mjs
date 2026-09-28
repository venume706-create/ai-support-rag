// Выбирает провайдер Prisma по DATABASE_URL и готовит базу.
//   node scripts/db-provider.mjs          — только переключить провайдер в schema.prisma
//   node scripts/db-provider.mjs setup    — переключить, сгенерировать клиент и применить схему
// SQLite (file:…) использует миграции из prisma/migrations,
// PostgreSQL (postgres://…, postgresql://…) — `prisma db push`.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL не задан. Скопируйте .env.example в .env.");
  process.exit(1);
}
const provider = /^postgres(ql)?:\/\//.test(url) ? "postgresql" : "sqlite";
const schemaPath = new URL("../prisma/schema.prisma", import.meta.url);
const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(/(datasource db \{\s*provider\s*=\s*)"[^"]+"/, `$1"${provider}"`);
if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`Провайдер БД: ${provider}`);
}

if (process.argv[2] === "setup") {
  const run = (cmd) => execSync(cmd, { stdio: "inherit" });
  run("npx prisma generate");
  run(provider === "sqlite" ? "npx prisma migrate deploy" : "npx prisma db push --skip-generate");
}
