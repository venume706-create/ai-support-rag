import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db, login, logout, uid } from "./helpers";

const PASSWORD = "right-pass1";

async function makeStudent(project: string, prefix = "sec") {
  const l = uid(prefix, project).toLowerCase();
  const user = await db.user.create({
    data: {
      login: l,
      passwordHash: bcrypt.hashSync(PASSWORD, 4),
      role: "STUDENT",
      firstName: "Защита",
      lastName: "Тестова",
      fullName: "Защита Тестова",
      nickname: `Ник_${l}`,
      nicknameKey: `ник_${l}`,
      searchKey: l,
      student: { create: {} },
    },
  });
  return { ...user, nick: `Ник_${l}` };
}

async function failLogins(page: Page, l: string, times: number) {
  await page.goto("/login");
  for (let i = 0; i < times; i++) {
    await page.fill("#login", l);
    await page.fill("#password", `wrong-${i}`);
    await page.click("button[type=submit]");
    await expect(page.getByTestId("login-error")).toHaveText("Неверный логин или пароль");
    // Каждая попытка записана в БД до следующей
    await expect.poll(() => db.loginAttempt.count({ where: { login: l, success: false } })).toBe(i + 1);
  }
}

async function cleanup(l: string) {
  await db.securityAlert.deleteMany({ where: { login: l } });
  await db.loginAttempt.deleteMany({ where: { login: l } });
  await db.user.deleteMany({ where: { login: l } });
  await db.notification.deleteMany({ where: { OR: [{ title: { contains: l } }, { body: { contains: l } }] } });
}

test.describe("Безопасность: уведомления вместо блокировок", () => {
  test("до 5 попыток тишина; на 5-й — уведомление админу; ничто не блокируется, правильный пароль пускает сразу", async ({ page }, info) => {
    const u = await makeStudent(info.project.name);
    const admin = await db.user.findFirstOrThrow({ where: { login: "admin" } });
    const notesBefore = await db.notification.count({ where: { userId: admin.id, type: "login_alert" } });
    try {
      await failLogins(page, u.login, 4);
      expect(await db.securityAlert.count({ where: { userId: u.id } })).toBe(0);

      await failLogins(page, u.login, 1).catch(() => undefined);
      // 5-я неудача (счёт в БД продолжается с 4 → 5): помощник ждал i+1=1, поэтому проверяем напрямую
      await expect.poll(() => db.securityAlert.count({ where: { userId: u.id, status: "OPEN" } })).toBe(1);
      const alert = await db.securityAlert.findFirstOrThrow({ where: { userId: u.id } });
      expect(alert.attempts).toBe(5);
      expect(alert.device).not.toBe("");
      expect(await db.notification.count({ where: { userId: admin.id, type: "login_alert" } })).toBe(notesBefore + 1);

      // Ещё неудачи — тот же открытый алерт, без новых уведомлений и без блокировки
      for (let i = 0; i < 2; i++) {
        await page.fill("#login", u.login);
        await page.fill("#password", `again-${i}`);
        await page.click("button[type=submit]");
        await expect(page.getByTestId("login-error")).toBeVisible();
      }
      await expect.poll(async () => (await db.securityAlert.findFirstOrThrow({ where: { userId: u.id } })).attempts).toBe(7);
      expect(await db.securityAlert.count({ where: { userId: u.id } })).toBe(1);
      expect(await db.notification.count({ where: { userId: admin.id, type: "login_alert" } })).toBe(notesBefore + 1);
      expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).isActive).toBe(true);

      // Правильный пароль пускает сразу — никаких блокировок и таймаутов
      await login(page, u.login, PASSWORD);
      await expect(page).toHaveURL(/\/student/);
    } finally {
      await cleanup(u.login);
    }
  });

  test("неизвестный логин и успешные входы не создают тревог", async ({ page }, info) => {
    const ghost = uid("ghost", info.project.name).toLowerCase();
    await failLogins(page, ghost, 6);
    expect(await db.securityAlert.count({ where: { login: ghost } })).toBe(0);
    await db.loginAttempt.deleteMany({ where: { login: ghost } });

    // Серия обрывается успешным входом
    const u = await makeStudent(info.project.name, "ser");
    try {
      await failLogins(page, u.login, 4);
      await login(page, u.login, PASSWORD);
      await logout(page);
      await page.goto("/login");
      for (let i = 0; i < 4; i++) {
        await page.fill("#login", u.login);
        await page.fill("#password", `zzz-${i}`);
        await page.click("button[type=submit]");
        await expect(page.getByTestId("login-error")).toBeVisible();
      }
      await expect.poll(() => db.loginAttempt.count({ where: { login: u.login, success: false } })).toBe(8);
      expect(await db.securityAlert.count({ where: { userId: u.id } })).toBe(0);
    } finally {
      await cleanup(u.login);
    }
  });

  test("админ: колокольчик, страница «Безопасность», «Всё в порядке» с записью в журнал", async ({ page }, info) => {
    const u = await makeStudent(info.project.name, "ok");
    try {
      await failLogins(page, u.login, 5);
      await login(page, "admin", "admin123");

      const bell = page.getByTestId("bell").filter({ visible: true }).first();
      await expect(bell).toHaveAttribute("data-unread", /[1-9]/);
      await expect(page.getByTestId("security-banner")).toBeVisible();
      await bell.click();
      await expect(page.getByTestId("bell-list")).toContainText(u.nick);
      await page.getByRole("dialog").getByRole("link", { name: "Открыть «Безопасность»" }).click();
      await expect(page).toHaveURL(/\/admin\/security/);

      const card = page.getByTestId("alert").filter({ has: page.locator(`[data-login="${u.login}"]`) }).or(page.locator(`[data-testid=alert][data-login="${u.login}"]`)).first();
      await expect(card).toContainText(u.nick);
      await expect(card.getByTestId("alert-attempts")).toHaveText("5 попыток подряд");
      await expect(card).toContainText("Устройство");
      await expect(card).toContainText("Адрес (IP)");

      await card.getByTestId("alert-ok").click();
      await page.getByTestId("confirm-action").click();
      await expect(page.locator(`[data-testid=alert][data-login="${u.login}"]`)).toHaveCount(0);
      expect((await db.securityAlert.findFirstOrThrow({ where: { userId: u.id } })).resolution).toBe("OK");
      expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).isActive).toBe(true);
      expect(await db.auditLog.count({ where: { action: "security_ok", targetLabel: u.nick } })).toBe(1);
      expect(await db.notification.count({ where: { type: "login_alert", link: { contains: (await db.securityAlert.findFirstOrThrow({ where: { userId: u.id } })).id }, readAt: null } })).toBe(0);

      await page.goto("/admin/security?tab=resolved");
      await expect(page.locator(`[data-testid=alert][data-login="${u.login}"]`)).toContainText("Отмечено: всё в порядке");
      await page.goto(`/admin/journal?q=${encodeURIComponent(u.nick)}`);
      await expect(page.getByTestId("audit-row").filter({ hasText: "Тревога безопасности: всё в порядке" })).toHaveCount(1);
    } finally {
      await cleanup(u.login);
    }
  });

  test("админ: «Сбросить пароль» выдаёт временный пароль, человек входит и выбирает свой", async ({ page }, info) => {
    const u = await makeStudent(info.project.name, "rst");
    try {
      await failLogins(page, u.login, 5);
      await login(page, "admin", "admin123");
      await page.goto("/admin/security");
      const card = page.locator(`[data-testid=alert][data-login="${u.login}"]`);
      await card.getByTestId("alert-reset").click();
      await page.getByTestId("confirm-action").click();
      const temp = (await page.getByTestId("temp-password").textContent())!.trim();
      expect(temp).toMatch(/^[a-z2-9]{8}$/);
      await page.getByRole("dialog").getByRole("button", { name: "Закрыть" }).first().click();

      const fresh = await db.user.findUniqueOrThrow({ where: { id: u.id } });
      expect(fresh.mustChangePassword).toBe(true);
      expect(await bcrypt.compare(temp, fresh.passwordHash)).toBe(true);
      expect(await db.auditLog.count({ where: { action: "security_password_reset", targetLabel: u.nick } })).toBe(1);

      await logout(page);
      await login(page, u.login, temp);
      await expect(page).toHaveURL(/\/welcome/);
    } finally {
      await cleanup(u.login);
    }
  });

  test("админ: блокирует вручную и разблокирует; заблокированный не входит, разблокированный входит", async ({ page }, info) => {
    const u = await makeStudent(info.project.name, "blk");
    try {
      await failLogins(page, u.login, 5);
      await login(page, "admin", "admin123");
      await page.goto("/admin/security");
      const card = page.locator(`[data-testid=alert][data-login="${u.login}"]`);
      await card.getByTestId("alert-block").click();
      await expect(page.getByRole("dialog")).toContainText("Заблокировать аккаунт");
      await page.getByTestId("confirm-action").click();
      await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: u.id } })).isActive).toBe(false);
      expect(await db.auditLog.count({ where: { action: "security_blocked", targetLabel: u.nick } })).toBe(1);

      await logout(page);
      await page.goto("/login");
      await page.fill("#login", u.login);
      await page.fill("#password", PASSWORD);
      await page.click("button[type=submit]");
      await expect(page.getByTestId("login-error")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);

      await login(page, "admin", "admin123");
      await page.goto("/admin/security?tab=resolved");
      const resolved = page.locator(`[data-testid=alert][data-login="${u.login}"]`);
      await expect(resolved).toContainText("Аккаунт заблокирован");
      await resolved.getByTestId("alert-unblock").click();
      await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: u.id } })).isActive).toBe(true);
      expect(await db.auditLog.count({ where: { action: "security_unblocked", targetLabel: u.nick } })).toBe(1);

      await logout(page);
      await login(page, u.login, PASSWORD);
      await expect(page).toHaveURL(/\/student/);
    } finally {
      await cleanup(u.login);
    }
  });

  test("страница «Безопасность» закрыта для учителя и ученика (403)", async ({ page }) => {
    await login(page, "teacher1", "teacher123");
    expect((await page.goto("/admin/security"))?.status()).toBe(403);
    await page.goto("/teacher");
    await logout(page);
    await login(page, "student1", "student123");
    expect((await page.goto("/admin/security"))?.status()).toBe(403);
    await expect(page.getByTestId("bell")).toHaveCount(0);
  });
});
