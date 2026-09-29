import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db, login, uid } from "./helpers";

const PAYLOAD = `<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;

test.describe("Защита от XSS и SQL-инъекций", () => {
  test("разметка в «о себе» и в заметке показывается текстом и не выполняется", async ({ page }, info) => {
    const teacher = await db.teacher.findFirstOrThrow({ where: { user: { login: "teacher1" } }, include: { groups: true } });
    const l = uid("xss", info.project.name).toLowerCase();
    const user = await db.user.create({
      data: {
        login: l,
        passwordHash: bcrypt.hashSync("x-pass-12", 4),
        role: "STUDENT",
        firstName: "Икс",
        lastName: "Эс",
        fullName: "Икс Эс",
        nickname: `Икс_${l}`,
        nicknameKey: `икс_${l}`,
        searchKey: l,
        bio: PAYLOAD,
        student: { create: { groups: { create: { groupId: teacher.groups[0].id } } } },
      },
      include: { student: true },
    });
    try {
      await login(page, "teacher1", "teacher123");
      await page.goto(`/teacher/students/${user.student!.id}`);
      await expect(page.getByTestId("student-card")).toContainText(PAYLOAD);
      await page.getByTestId("note-text").fill(PAYLOAD);
      await page.getByTestId("note-add").click();
      await expect(page.getByTestId("note").filter({ hasText: PAYLOAD })).toBeVisible();
      await page.reload();
      await expect(page.getByTestId("note").filter({ hasText: PAYLOAD })).toBeVisible();
      expect(await page.locator("main img[src='x']").count()).toBe(0);
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });

  test("SQL-подобный ввод в поиске и в логине ничего не ломает и не раскрывает", async ({ page }) => {
    const usersBefore = await db.user.count();
    await login(page, "admin", "admin123");
    for (const q of ["' OR '1'='1", `"; DROP TABLE "User"; --`, "1; SELECT * FROM User", "') UNION SELECT passwordHash FROM User --"]) {
      const res = await page.goto(`/admin/students?q=${encodeURIComponent(q)}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByTestId("students-table")).toHaveCount(0);
      await expect(page.getByTestId("empty-state")).toBeVisible();
    }
    expect(await db.user.count()).toBe(usersBefore);
    // Знаки подстановки LIKE не ломают страницу
    for (const q of ["%", "_"]) expect((await page.goto(`/admin/students?q=${encodeURIComponent(q)}`))?.status()).toBe(200);

    await page.context().clearCookies({ name: "authjs.session-token" });
    await page.goto("/login");
    await page.fill("#login", "admin' --");
    await page.fill("#password", "anything");
    await page.click("button[type=submit]");
    await expect(page.getByTestId("login-error")).toHaveText("Неверный логин или пароль");
  });
});
