import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("без входа — редирект на /login, API — 401", async ({ page }) => {
  await page.goto("/admin/students");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin%2Fstudents/);
  expect((await page.request.get("/api/groups/any")).status()).toBe(401);
});

test("неверный пароль — понятная ошибка", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#login", "admin");
  await page.fill("#password", "wrong-password");
  await page.click("button[type=submit]");
  await expect(page.getByTestId("login-error")).toHaveText("Неверный логин или пароль");
});

test("переключение тёмной темы", async ({ page }) => {
  await login(page, "student1", "student123");
  await page.getByTestId("theme-toggle").filter({ visible: true }).first().click();
  await page.getByRole("menuitem", { name: "Тёмная" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("theme-toggle").filter({ visible: true }).first().click();
  await page.getByRole("menuitem", { name: "Светлая" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
