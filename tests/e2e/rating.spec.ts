import { expect, test } from "@playwright/test";
import { db, login } from "./helpers";

test.describe("Рейтинг: ранги, динамика, доска почёта, награды", () => {
  test("ученик видит ранг, динамику, график, места, подсказки и объяснение", async ({ page }) => {
    await login(page, "student2", "student123");
    await expect(page.getByTestId("rank-summary")).toBeVisible();
    const rank = await page.getByTestId("rank-summary").getAttribute("data-rank");
    expect(["novice", "student", "advanced", "honor", "master", "legend"]).toContain(rank);
    await expect(page.getByTestId("rank-name")).not.toBeEmpty();
    await expect(page.getByTestId("delta")).toBeVisible();
    await expect(page.getByTestId("trend-chart")).toBeVisible();
    await expect(page.getByTestId("places").locator("li").first()).toContainText("место");

    // Подсказки: три действия, первое — «Быстрее всего», польза по убыванию
    const tips = page.getByTestId("tips").locator("li");
    await expect(tips).toHaveCount(3);
    await expect(tips.first()).toContainText("Быстрее всего");

    // Как считается рейтинг
    await page.getByTestId("how-it-works").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Успеваемость — до 50 баллов");
    await expect(dialog).toContainText("Посещаемость — до 25 баллов");
    await expect(dialog).toContainText("Домашние задания — до 25 баллов");
    for (const name of ["Новичок", "Ученик", "Продвинутый", "Отличник", "Мастер", "Легенда"]) await expect(dialog).toContainText(name);
  });

  test("ранг совпадает с баллами, а «до следующего ранга» считается правильно", async ({ page }) => {
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: "student3" } } });
    await login(page, "student3", "student123");
    const res = await page.request.get(`/api/students/${kid.id}/rating`);
    const total: number = (await res.json()).rating.total;
    const thresholds = [[95, "legend"], [85, "master"], [70, "honor"], [50, "advanced"], [30, "student"], [0, "novice"]] as const;
    const expected = thresholds.find(([min]) => total >= min)![1];
    await expect(page.getByTestId("rank-summary")).toHaveAttribute("data-rank", expected);
    const next = [30, 50, 70, 85, 95].find((m) => m > total);
    if (next) {
      const left = Math.ceil((next - total) * 10 - 1e-9) / 10;
      await expect(page.getByTestId("to-next")).toContainText(String(left));
    } else await expect(page.getByTestId("to-next")).toContainText("высшего ранга");
  });

  test("доска почёта: топ-10 по нику и баллам, пьедестал, скрытые ученики не видны", async ({ page }) => {
    const hidden = await db.user.findUniqueOrThrow({ where: { login: "student30" }, include: { student: { include: { groups: true } } } });
    const viewer = await db.user.findUniqueOrThrow({ where: { login: "student1" } });
    await login(page, "student1", "student123");
    await expect(page.getByTestId("podium-place")).toHaveCount(3);
    // На пьедестале стоят места 1, 2, 3 (порядок на экране: 2, 1, 3)
    expect(await page.getByTestId("podium-place").evaluateAll((els) => els.map((e) => e.getAttribute("data-place")))).toEqual(["2", "1", "3"]);
    const nicks = await page.getByTestId("board-nick").allTextContents();
    expect(nicks.length).toBeLessThanOrEqual(10);
    expect(new Set(nicks).size).toBe(nicks.length);
    // В доске только ники: имён и фамилий нет
    const board = await page.getByTestId("leaderboard").innerText();
    const realNames = await db.user.findMany({ where: { role: "STUDENT" }, select: { firstName: true, lastName: true } });
    for (const n of realNames.slice(0, 30)) expect(board).not.toContain(`${n.firstName} ${n.lastName}`);
    // Скрытый ученик (student30) — только если он в той же группе — не показан; сам зритель выделен
    expect(nicks).not.toContain(hidden.nickname!);
    await expect(page.getByTestId("leaderboard").getByText("это вы").first()).toBeVisible();
    expect(nicks.some((n) => n.startsWith(viewer.nickname!))).toBe(true);

    // Скрытый ученик видит подсказку и своё место
    const ctx = page.context();
    await ctx.clearCookies();
    await login(page, "student30", "student123");
    await expect(page.getByTestId("board-hidden")).toBeVisible();
    await expect(page.getByTestId("places").locator("li").first()).toContainText("место");
    expect(await page.getByTestId("board-nick").allTextContents()).not.toContain(hidden.nickname!);
  });

  test("награды выдаются автоматически: 5 пятёрок подряд после действий учителя", async ({ page }, info) => {
    const who = info.project.name === "mobile" ? "student8" : "student9";
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: who } }, include: { groups: true } });
    const group = kid.groups[0];
    await db.studentAchievement.deleteMany({ where: { studentId: kid.id } });
    // Чистая серия: пять пятёрок «сегодня-N», после всех остальных оценок
    await db.grade.deleteMany({ where: { studentId: kid.id } });
    const base = new Date();
    for (let i = 0; i < 5; i++) {
      await db.grade.create({ data: { studentId: kid.id, groupId: group.groupId, date: new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - 4 + i)), value: 5 } });
    }
    await login(page, who, "student123");
    const shelf = page.getByTestId("achievements");
    await expect(shelf.locator('[data-achievement="five_streak"]')).toHaveAttribute("data-earned", "true");
    await expect(shelf.locator('[data-achievement="first_five"]')).toHaveAttribute("data-earned", "true");
    await expect(shelf.locator('[data-achievement="homework_all"]')).toHaveAttribute("data-earned", "false");
    expect(await db.studentAchievement.count({ where: { studentId: kid.id, code: "five_streak" } })).toBe(1);
    // Повторный заход награду не дублирует
    await page.reload();
    expect(await db.studentAchievement.count({ where: { studentId: kid.id, code: "five_streak" } })).toBe(1);
  });

  test("учитель: доска почёта группы; рейтинг учителя с посещаемостью и долей ДЗ", async ({ page }) => {
    const group = await db.group.findFirstOrThrow({ where: { teacher: { user: { login: "teacher1" } } } });
    await login(page, "teacher1", "teacher123");
    await expect(page.getByTestId("teacher-stats")).toBeVisible();
    await expect(page.getByTestId("teacher-stats")).toContainText("Посещаемость групп");
    await expect(page.getByTestId("teacher-stats")).toContainText("Доля сданных ДЗ");
    await page.goto(`/teacher/groups/${group.id}?tab=students`);
    await expect(page.getByTestId("board-card").getByTestId("podium-place")).toHaveCount(3);
    // Учитель видит ранг ученика, но не чужие группы
    const member = await db.groupStudent.findFirstOrThrow({ where: { groupId: group.id } });
    await page.goto(`/teacher/students/${member.studentId}`);
    await expect(page.getByTestId("rank-summary")).toBeVisible();
    await expect(page.getByTestId("tips")).toHaveCount(0);
  });

  test("админ: рейтинг учителей с посещаемостью и долей ДЗ, доска группы", async ({ page }) => {
    await login(page, "admin", "admin123");
    const row = page.getByTestId("teacher-ratings").getByRole("row").nth(1);
    await expect(row).toContainText("Посещ.");
    await expect(row).toContainText("%");
    const group = await db.group.findFirstOrThrow();
    await page.goto(`/admin/groups/${group.id}`);
    await expect(page.getByTestId("board-card").getByTestId("podium")).toBeVisible();
  });
});
