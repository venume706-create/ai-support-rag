import { expect, test } from "@playwright/test";
import { db, login } from "./helpers";

test.describe("Ученик", () => {
  test("видит свой рейтинг с разбивкой", async ({ page }) => {
    await login(page, "student1", "student123");
    await expect(page).toHaveURL(/\/student$/);
    const card = page.getByTestId("rating-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("rating-gauge")).toBeVisible();
    await expect(card.getByRole("progressbar")).toHaveCount(3);
    const total = await page.getByTestId("rating-total").textContent();
    expect(Number(total)).toBeGreaterThan(0);

    const me = await db.student.findFirstOrThrow({ where: { user: { login: "student1" } } });
    const res = await page.request.get(`/api/students/${me.id}/rating`);
    expect(res.status()).toBe(200);
    expect((await res.json()).rating.total.toFixed(1)).toBe(total);

    // Фильтр периода
    await page.getByRole("tab", { name: "Текущий месяц" }).click();
    await expect(page).toHaveURL(/period=month/);
    await expect(page.getByRole("tab", { name: "Текущий месяц" })).toHaveAttribute("aria-selected", "true");

    for (const path of ["/student/grades", "/student/attendance", "/student/homework", "/student/schedule"]) {
      const r = await page.goto(path);
      expect(r?.status()).toBe(200);
    }
    await expect(page.getByTestId("week-planner")).toBeVisible();
  });

  test("не может открыть данные другого ученика — 403", async ({ page }) => {
    const other = await db.student.findFirstOrThrow({ where: { user: { login: "student2" } } });
    const otherGroup = await db.group.findFirstOrThrow({ where: { students: { none: { student: { user: { login: "student1" } } } } } });
    await login(page, "student1", "student123");

    expect((await page.request.get(`/api/students/${other.id}/rating`)).status()).toBe(403);
    expect((await page.request.get(`/api/groups/${otherGroup.id}`)).status()).toBe(403);

    for (const path of [`/admin/students/${other.id}`, `/teacher/students/${other.id}`]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(403);
      await expect(page.getByRole("heading", { name: "Доступ запрещён" })).toBeVisible();
    }
  });
});
