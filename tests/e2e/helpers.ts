import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

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

/** Настоящая картинка PNG для проверки загрузки фото. */
export function pngBuffer(width = 900, height = 600) {
  return sharp({ create: { width, height, channels: 3, background: "#4a72b0" } }).png().toBuffer();
}

/** Проходит мастер первого входа: ник → свой пароль → пропустить фото. */
export async function completeWizard(page: Page, nick: string, password: string) {
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByTestId("nickname-input").fill(nick);
  await expect(page.getByTestId("nickname-status")).toHaveText("Ник свободен");
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.locator("#w-next").fill(password);
  await page.locator("#w-confirm").fill(password);
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByTestId("wizard-finish").click();
  await expect(page).not.toHaveURL(/\/welcome/);
}

/** Выход через меню и ожидание, пока сессия действительно закрыта (повторный заход на /login не перекинет в кабинет). */
export async function logout(page: Page) {
  await page.waitForLoadState("networkidle"); // страница догружена и «оживлена» — кнопка выхода точно сработает
  await page.getByTestId("logout").filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState("networkidle");
  // Фоновые предзагрузки страниц кабинета, дошедшие после выхода, могут заново выдать cookie (обновление сессии Auth.js) —
  // для тестов выход считается завершённым, когда cookie сессии точно нет
  await page.context().clearCookies({ name: "authjs.session-token" });
}
