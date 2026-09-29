import { expect, test } from "@playwright/test";
import { db, login } from "./helpers";

test.describe("Графика и анимации", () => {
  test("новая награда: поздравление и конфетти показываются один раз", async ({ page }, info) => {
    const who = info.project.name === "mobile" ? "student10" : "student11";
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: who } }, include: { groups: true } });
    await db.studentAchievement.deleteMany({ where: { studentId: kid.id } });
    await db.grade.deleteMany({ where: { studentId: kid.id } });
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      await db.grade.create({
        data: { studentId: kid.id, groupId: kid.groups[0].groupId, date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 4 + i)), value: 5 },
      });
    }
    await login(page, who, "student123");
    const banner = page.getByTestId("celebration");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Новая награда");
    expect(await banner.getAttribute("data-achievements")).toContain("five_streak");
    await expect(page.getByTestId("confetti")).toBeAttached();
    // сервер запомнил, что ученик увидел награды
    await expect.poll(() => db.studentAchievement.count({ where: { studentId: kid.id, seen: false } })).toBe(0);
    await page.reload();
    await expect(page.getByTestId("celebration")).toHaveCount(0);
    await expect(page.getByTestId("confetti")).toHaveCount(0);
    await expect(page.locator('[data-achievement="five_streak"]')).toHaveAttribute("data-earned", "true");
  });

  test("новый ранг: поздравление, потом ранг запоминается", async ({ page }, info) => {
    const who = info.project.name === "mobile" ? "student12" : "student13";
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: who } } });
    await db.student.update({ where: { id: kid.id }, data: { seenRank: -1 } });
    await login(page, who, "student123");
    const banner = page.getByTestId("celebration");
    await expect(banner).toBeVisible();
    const rank = await banner.getAttribute("data-rank");
    expect(rank).toBeTruthy();
    await expect(page.getByTestId("celebration-rank")).toContainText("Новый ранг");
    expect(rank).toBe(await page.getByTestId("rank-summary").getAttribute("data-rank"));
    await expect.poll(async () => (await db.student.findUniqueOrThrow({ where: { id: kid.id } })).seenRank).toBeGreaterThanOrEqual(0);
    await page.reload();
    await expect(page.getByTestId("celebration-rank")).toHaveCount(0);
  });

  test("«уменьшить движение»: поздравление без конфетти, числа и шкалы сразу готовые", async ({ browser }, info) => {
    const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, reducedMotion: "reduce", viewport: info.project.use.viewport });
    const page = await ctx.newPage();
    const who = info.project.name === "mobile" ? "student14" : "student15";
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: who } } });
    await db.student.update({ where: { id: kid.id }, data: { seenRank: -1 } });
    await login(page, who, "student123");
    await expect(page.getByTestId("celebration")).toBeVisible();
    await expect(page.getByTestId("confetti")).toHaveCount(0);
    // Число рейтинга сразу равно итоговому (без «набегания»)
    const total = page.getByTestId("rating-total");
    expect(await total.textContent()).toBe(await total.getAttribute("data-value"));
    // Анимации отключены (длительность ~0)
    const dur = await page.locator(".bar-fill").first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(dur).toBeLessThan(0.01);
    await ctx.close();
  });

  test("обычный режим: у шкал и стрелки есть анимация, число набегает и приходит к итогу", async ({ page }) => {
    await login(page, "student4", "student123");
    const barAnim = await page.locator(".bar-fill").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(barAnim).toBe("bar-fill");
    expect(await page.locator(".needle").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("needle-sweep");
    const total = page.getByTestId("rating-total");
    const final = await total.getAttribute("data-value");
    await expect(total).toHaveText(final!, { timeout: 5000 });
  });

  test("графики ученика совпадают с данными: гистограмма оценок и кольцо посещаемости", async ({ page }) => {
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: "student6" } } });
    const grades = await db.grade.findMany({ where: { studentId: kid.id } });
    const marks = await db.attendance.findMany({ where: { studentId: kid.id } });
    await login(page, "student6", "student123");
    await page.goto("/student/grades");
    for (const g of [1, 2, 3, 4, 5]) {
      await expect(page.locator(`[data-grade-bar="${g}"]`)).toHaveAttribute("data-count", String(grades.filter((x) => x.value === g).length));
    }
    await page.goto("/student/attendance");
    for (const s of ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const) {
      const n = marks.filter((m) => m.status === s).length;
      if (n > 0) await expect(page.locator(`[data-status="${s}"]`).first()).toHaveAttribute("data-count", String(n));
    }
    await expect(page.getByTestId("attendance-ring")).toBeVisible();
  });

  test("дашборды: график посещаемости и столбики рейтинга по группам", async ({ page, browser }, info) => {
    await login(page, "admin", "admin123");
    await expect(page.getByTestId("attendance-trend").getByTestId("trend-chart")).toBeVisible();
    await expect(page.getByTestId("group-ratings").locator("[data-bar]")).toHaveCount(await db.group.count());
    // счётчики: колёсики одометра установлены на цифры значения
    const card = page.getByTestId("stat-card").first();
    const value = String(await card.getAttribute("data-value"));
    const digits = await card.locator(".odometer-strip").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.getPropertyValue("--d")));
    expect(digits.join("")).toBe(value.replace(/\D/g, ""));

    const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport });
    const t = await ctx.newPage();
    await login(t, "teacher1", "teacher123");
    await expect(t.getByTestId("attendance-trend").getByTestId("trend-chart")).toBeVisible();
    await expect(t.getByTestId("group-ratings").locator("[data-bar]")).toHaveCount(2);
    await ctx.close();
  });

  test("пустой экран: иллюстрация и понятная фраза", async ({ page }) => {
    await login(page, "student7", "student123");
    await page.goto("/student/grades?q=такого-нет-нигде");
    const empty = page.getByTestId("empty-state").first();
    await expect(empty).toBeVisible();
    await expect(empty.locator("svg")).toBeVisible();
    await expect(empty).toHaveAttribute("data-kind", "search");
    await expect(empty).toContainText("Ничего не найдено");
  });
});
