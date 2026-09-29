import { defineConfig, devices } from "@playwright/test";
import type { SafeArea } from "./tests/e2e/fixtures";

// E2E работают на отдельной базе, которую global-setup пересоздаёт из сида
/** [имя проекта, устройство Playwright, безопасные зоны экрана] */
const DEVICES: [string, string, SafeArea][] = [
  ["iphone-15", "iPhone 15", { top: 59, bottom: 34, left: 0, right: 0 }],
  ["iphone-15-landscape", "iPhone 15 landscape", { top: 0, bottom: 21, left: 59, right: 59 }],
  ["iphone-se", "iPhone SE", { top: 20, bottom: 0, left: 0, right: 0 }],
  ["samsung-s24", "Galaxy S24", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["samsung-s9plus", "Galaxy S9+", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["ipad-portrait", "iPad (gen 7)", { top: 24, bottom: 20, left: 0, right: 0 }],
  ["ipad-pro-landscape", "iPad Pro 11 landscape", { top: 24, bottom: 20, left: 0, right: 0 }],
  ["galaxy-tab-portrait", "Galaxy Tab S4", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["galaxy-tab-landscape", "Galaxy Tab S4 landscape", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["laptop-1366", "Desktop Chrome", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["laptop-1440", "Desktop Chrome", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["monitor-1920", "Desktop Chrome", { top: 0, bottom: 0, left: 0, right: 0 }],
  ["monitor-2560", "Desktop Chrome", { top: 0, bottom: 0, left: 0, right: 0 }],
];

/** Размеры экранов ноутбуков и мониторов (для «Desktop Chrome») */
const VIEWPORTS: Record<string, { width: number; height: number }> = {
  "laptop-1366": { width: 1366, height: 768 },
  "laptop-1440": { width: 1440, height: 900 },
  "monitor-1920": { width: 1920, height: 1080 },
  "monitor-2560": { width: 2560, height: 1440 },
};

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
    // Функциональные сценарии — на компьютере и на телефоне
    { name: "desktop", testIgnore: /responsive/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: /responsive/, use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    // Проверка вёрстки на устройствах: npm run test:devices (скриншоты — в out/screenshots/)
    ...DEVICES.map(([name, descriptor, safeArea]) => ({
      name: `dev-${name}`,
      testMatch: /responsive/,
      // Эмуляция экранов идёт в Chromium; масштаб пикселей 1 — чтобы скриншоты были небольшими (вёрстка та же)
      use: { ...devices[descriptor], ...(VIEWPORTS[name] ? { viewport: VIEWPORTS[name] } : {}), defaultBrowserType: "chromium" as const, deviceScaleFactor: 1, safeArea },
    })),
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: E2E_DB, STORAGE_DIR: "storage-e2e", AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-123", APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Asia/Tashkent" },
  },
});
