import { defineConfig, devices } from "@playwright/test";

// E2E работают на отдельной базе, которую global-setup пересоздаёт из сида
const E2E_DB = "file:./e2e.db";
const PORT = 3200;
process.env.DATABASE_URL = E2E_DB;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ru-RU",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: E2E_DB, STORAGE_DIR: "storage-e2e", AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-123", APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Asia/Tashkent" },
  },
});
