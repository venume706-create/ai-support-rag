import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({ datasources: { db: { url: "file:./e2e.db" } } });

export async function login(page: Page, login: string, password: string) {
  await page.goto("/login");
  await page.fill("#login", login);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

export async function ratingTotal(page: Page, studentId: string): Promise<number | null> {
  const res = await page.request.get(`/api/students/${studentId}/rating`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.rating.total;
}

/** Уникальный суффикс, чтобы desktop- и mobile-прогоны не конфликтовали. */
export function uid(prefix: string, project: string) {
  return `${prefix}${project === "mobile" ? "m" : "d"}${Date.now().toString(36).slice(-5)}`;
}
