import { expect, test } from "@playwright/test";
import { db, login } from "./helpers";

test("пользователь меняет свой пароль и входит с новым", async ({ page }, info) => {
  const user = info.project.name === "mobile" ? "student27" : "student28";
  await login(page, user, "student123");
  await page.getByTestId("account-link").filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/profile$/);
  const form = page.getByTestId("password-form");

  // Неверный текущий пароль
  await form.locator("#pw-current").fill("wrong-one");
  await form.locator("#pw-next").fill("newpass123");
  await form.locator("#pw-confirm").fill("newpass123");
  await form.locator("button[type=submit]").click();
  await expect(page.getByTestId("error-pw-current")).toHaveText("Текущий пароль указан неверно");

  // Несовпадение подтверждения
  await form.locator("#pw-current").fill("student123");
  await form.locator("#pw-confirm").fill("other-pass");
  await form.locator("button[type=submit]").click();
  await expect(page.getByTestId("error-pw-confirm")).toHaveText("Пароли не совпадают");

  await form.locator("#pw-confirm").fill("newpass123");
  await form.locator("button[type=submit]").click();
  await expect(page.getByText("Пароль изменён").first()).toBeVisible();

  await page.getByTestId("logout").filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.fill("#login", user);
  await page.fill("#password", "student123");
  await page.click("button[type=submit]");
  await expect(page.getByTestId("login-error")).toHaveText("Неверный логин или пароль");
  await login(page, user, "newpass123");
  await expect(page).toHaveURL(/\/student$/);
});

test("история ученика листается, в группе работает поиск", async ({ page }) => {
  const student = await db.student.findFirstOrThrow({ where: { user: { login: "student1" } }, include: { user: true } });
  const total = await db.attendance.count({ where: { studentId: student.id } });
  expect(total).toBeGreaterThan(10);
  await login(page, "admin", "admin123");
  await page.goto(`/admin/students/${student.id}`);
  const card = page.locator("#attendance");
  await expect(card.getByTestId("pagination")).toContainText(`1–10 из ${total}`);
  await card.getByRole("link", { name: "Вперёд" }).click();
  await expect(page).toHaveURL(/ap=2/);
  await expect(page.locator("#attendance").getByTestId("pagination")).toContainText(`11–${Math.min(20, total)} из ${total}`);

  const group = await db.group.findFirstOrThrow({ where: { students: { some: { studentId: student.id } } } });
  await page.goto(`/admin/groups/${group.id}?q=${encodeURIComponent(student.user.lastName)}`);
  await expect(page.getByTestId("group-students").getByRole("row")).toHaveCount(2);
  await expect(page.getByTestId("group-students")).toContainText(student.user.nickname!);
});
