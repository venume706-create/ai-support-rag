import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { db, login, pngBuffer, uid } from "./helpers";

// Ученики, которых используют только эти сценарии (чтобы не мешать остальным тестам)
const KID = { desktop: "student21", mobile: "student22" } as const;

test.describe("Профиль", () => {
  test("ученик правит свой профиль: ник уникален, оформление и доска почёта сохраняются", async ({ page }, info) => {
    const who = KID[info.project.name as "desktop" | "mobile"];
    const me = await db.user.findUniqueOrThrow({ where: { login: who } });
    await login(page, who, "student123");
    await page.goto("/profile");

    const nick = page.getByTestId("nickname-input");
    // Чужой ник занят (регистр не важен)
    await nick.fill("МАДО");
    await expect(page.getByTestId("error-pf-nickname")).toHaveText("Этот ник уже занят");
    await expect(page.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    // Слишком короткий и с пробелом
    await nick.fill("ab");
    await expect(page.getByTestId("error-pf-nickname")).toContainText("от 3 символов");
    await nick.fill("я я я");
    await expect(page.getByTestId("error-pf-nickname")).toContainText("без пробелов");
    // Свободный ник
    const fresh = uid("Ник", info.project.name).slice(0, 12);
    await nick.fill(fresh);
    await expect(page.getByTestId("nickname-status")).toHaveText("Ник свободен");

    await page.locator("#pf-bio").fill("Люблю шахматы");
    await page.locator("#pf-email").fill("kid@example.com");
    await page.locator('label:has(input[name="avatarFrame"][value="brass"])').click();
    await page.locator('label:has(input[name="cardColor"][value="sky"])').click();
    await page.getByTestId("leaderboard-toggle").uncheck();
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Профиль сохранён").first()).toBeVisible();

    const saved = await db.user.findUniqueOrThrow({ where: { id: me.id }, include: { student: true } });
    expect(saved.nickname).toBe(fresh);
    expect(saved.nicknameKey).toBe(fresh.toLowerCase());
    expect([saved.bio, saved.email, saved.avatarFrame, saved.cardColor]).toEqual(["Люблю шахматы", "kid@example.com", "brass", "sky"]);
    expect(saved.student?.showInLeaderboard).toBe(false);
    // Правка своего профиля учеником в журнал администратора не пишется
    expect(await db.auditLog.count({ where: { targetId: me.id, action: "profile_edited" } })).toBe(0);

    // Ник — главное имя в шапке/меню, имя и фамилия — вторым планом
    await page.goto("/student");
    const sidebar = page.getByTestId("current-user").filter({ visible: true });
    if (await sidebar.count()) await expect(sidebar.first().getByTestId("person-nick")).toHaveText(fresh);
  });

  test("свой собственный ник можно оставить (не «занят»)", async ({ page }) => {
    await login(page, "student23", "student123");
    await page.goto("/profile");
    await expect(page.getByTestId("nickname-status")).toHaveText("Это ваш ник");
    await expect(page.getByRole("button", { name: "Сохранить" })).toBeEnabled();
  });

  test("фото: загрузка с обрезкой, показ другим, удаление, заглушка с буквой ника", async ({ page, browser }, info) => {
    const who = info.project.name === "mobile" ? "student24" : "student25";
    const me = await db.user.findUniqueOrThrow({ where: { login: who } });
    await login(page, who, "student123");
    await page.goto("/profile");
    // Без фото — заглушка с первой буквой ника
    const avatar = page.getByTestId("avatar").first();
    await expect(avatar).toHaveAttribute("data-has-photo", "false");
    await expect(avatar).toContainText(Array.from(me.nickname!)[0].toUpperCase());

    await page.getByTestId("avatar-input").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: await pngBuffer() });
    await expect(page.getByTestId("crop-area")).toBeVisible();
    await page.getByTestId("crop-zoom").fill("1.8");
    await page.getByTestId("crop-save").click();
    await expect(page.getByText("Фото сохранено").first()).toBeVisible();
    await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: me.id } })).avatarKey).toMatch(/^avatars\/.+\.webp$/);
    const after = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    expect(existsSync(path.join(__dirname, "..", "..", "storage-e2e", after.avatarKey!))).toBe(true);
    await expect(page.getByTestId("avatar").first()).toHaveAttribute("data-has-photo", "true");

    // Файл — настоящий квадратный WebP, доступный другим вошедшим, но не гостям
    const res = await page.request.get(`/api/users/${me.id}/avatar?v=${after.avatarVersion}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/webp");
    expect((await res.body()).subarray(8, 12).toString()).toBe("WEBP");
    const guest = await browser.newContext({ baseURL: info.project.use.baseURL });
    expect((await guest.request.get(`/api/users/${me.id}/avatar`, { maxRedirects: 0 })).status()).toBe(401);
    await guest.close();

    // Удаление
    await page.getByTestId("avatar-remove").click();
    await expect(page.getByText("Фото убрано").first()).toBeVisible();
    await expect(page.getByTestId("avatar").first()).toHaveAttribute("data-has-photo", "false");
    expect((await db.user.findUniqueOrThrow({ where: { id: me.id } })).avatarKey).toBeNull();
    expect(existsSync(path.join(__dirname, "..", "..", "storage-e2e", after.avatarKey!))).toBe(false);
  });

  test("загрузка: не-картинки и слишком большие файлы отклоняются сервером", async ({ page }, info) => {
    const who = info.project.name === "mobile" ? "student26" : "student27";
    const me = await db.user.findUniqueOrThrow({ where: { login: who } });
    await login(page, who, "student123");
    const post = (name: string, mimeType: string, buffer: Buffer) =>
      page.request.post(`/api/users/${me.id}/avatar`, { multipart: { file: { name, mimeType, buffer } } });
    expect((await post("x.svg", "image/svg+xml", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).status()).toBe(415);
    expect((await post("x.png", "image/png", Buffer.from("это не картинка, а текст под видом png"))).status()).toBe(415);
    expect((await post("big.jpg", "image/jpeg", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024 + 10)]))).status()).toBe(413);
    expect((await db.user.findUniqueOrThrow({ where: { id: me.id } })).avatarKey).toBeNull();
  });

  test("нельзя менять чужое фото; администратор — можно", async ({ page, browser }, info) => {
    const owner = await db.user.findUniqueOrThrow({ where: { login: "student28" } });
    await login(page, "student1", "student123");
    const form = { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: await pngBuffer(64, 64) } } };
    expect((await page.request.post(`/api/users/${owner.id}/avatar`, form)).status()).toBe(403);
    expect((await page.request.delete(`/api/users/${owner.id}/avatar`)).status()).toBe(403);

    const adminCtx = await browser.newContext({ baseURL: info.project.use.baseURL });
    const adminPage = await adminCtx.newPage();
    await login(adminPage, "admin", "admin123");
    expect((await adminPage.request.post(`/api/users/${owner.id}/avatar`, { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: await pngBuffer(64, 64) } } })).status()).toBe(200);
    expect(await db.auditLog.count({ where: { targetId: owner.id, action: "avatar_changed" } })).toBeGreaterThan(0);
    expect((await adminPage.request.delete(`/api/users/${owner.id}/avatar`)).status()).toBe(200);
    await adminCtx.close();
  });

  test("чужие контакты и даты рождения не показываются (учитель, другой ученик)", async ({ page }) => {
    const kid = await db.user.findUniqueOrThrow({ where: { login: "student1" }, include: { student: true } });
    const bday = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(kid.birthDate!);
    await login(page, "teacher1", "teacher123");
    await page.goto(`/teacher/students/${kid.student!.id}`);
    const html = await page.content();
    for (const secret of [kid.phone, kid.student!.parentPhone, bday, kid.email].filter(Boolean)) expect(html).not.toContain(secret);
    await expect(page.getByTestId("student-card").getByText(kid.nickname!)).toBeVisible();
  });
});

test.describe("Мастер первого входа и права администратора", () => {
  test("до завершения мастера кабинет закрыт; ник уникален; после — всё открыто", async ({ page }, info) => {
    const l = uid("wiz", info.project.name);
    await db.user.create({
      data: {
        login: l,
        passwordHash: (await import("bcryptjs")).default.hashSync("temp-pass1", 10),
        role: "STUDENT",
        firstName: "Мастер",
        lastName: "Тестов",
        fullName: "Мастер Тестов",
        searchKey: l,
        mustChangePassword: true,
        student: { create: {} },
      },
    });
    await login(page, l, "temp-pass1");
    // Любая страница кабинета и API перенаправляют/закрываются, пока мастер не пройден
    await page.goto("/student/grades");
    await expect(page).toHaveURL(/\/welcome/);
    expect((await page.request.get("/api/groups/any")).status()).toBe(403);

    // Занятый ник не принимается
    await page.getByTestId("nickname-input").fill("Лисичка");
    await expect(page.getByTestId("error-w-nickname")).toHaveText("Этот ник уже занят");
    await expect(page.getByRole("button", { name: "Дальше" })).toBeDisabled();
    // Новый пароль не должен совпадать с временным
    const nick = uid("Н", info.project.name);
    await page.getByTestId("nickname-input").fill(nick);
    await expect(page.getByTestId("nickname-status")).toHaveText("Ник свободен");
    await page.getByRole("button", { name: "Дальше" }).click();
    await page.locator("#w-next").fill("temp-pass1");
    await page.locator("#w-confirm").fill("temp-pass1");
    await page.getByRole("button", { name: "Дальше" }).click();
    await expect(page.getByTestId("error-w-next")).toHaveText("Новый пароль не должен совпадать с временным");
    await page.locator("#w-next").fill("brand-new-pass");
    await page.locator("#w-confirm").fill("brand-new-pass");
    await page.getByRole("button", { name: "Дальше" }).click();
    // Шаг 3: фото — по желанию; загружаем
    await page.getByTestId("avatar-input").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: await pngBuffer() });
    await page.getByTestId("crop-save").click();
    await expect(page.getByText("Фото сохранено").first()).toBeVisible();
    await page.getByTestId("wizard-finish").click();
    await expect(page).toHaveURL(/\/student$/);
    const u = await db.user.findUniqueOrThrow({ where: { login: l } });
    expect([u.nickname, u.mustChangePassword, Boolean(u.avatarKey)]).toEqual([nick, false, true]);
    expect((await page.request.get("/api/groups/any")).status()).toBe(404);
  });

  test("админ правит любой профиль (запись в журнал), сбрасывает пароль — человек проходит мастер снова", async ({ page, browser }, info) => {
    const who = info.project.name === "mobile" ? "student29" : "student30";
    const kid = await db.user.findUniqueOrThrow({ where: { login: who }, include: { student: true } });
    await login(page, "admin", "admin123");
    await page.goto(`/admin/students/${kid.student!.id}`);
    await expect(page.getByTestId("profile-nick")).toHaveText(kid.nickname!);
    await expect(page.getByTestId("profile-realname")).toHaveText(`${kid.firstName} ${kid.lastName}`);

    await page.getByTestId("edit-profile").click();
    await page.locator("#ap-bio").fill("Исправлено администратором");
    await page.locator("#ap-phone").fill("+998 90 555-55-55");
    await page.getByTestId("profile-form").getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByTestId("profile-form")).toBeHidden();
    const edited = await db.user.findUniqueOrThrow({ where: { id: kid.id } });
    expect([edited.bio, edited.phone]).toEqual(["Исправлено администратором", "+998 90 555-55-55"]);
    const log = await db.auditLog.findFirstOrThrow({ where: { targetId: kid.id, action: "profile_edited" }, orderBy: { createdAt: "desc" } });
    expect(log.actorLabel).toBe("Директор");
    expect(log.details).toContain("bio");
    expect(log.details).not.toContain("+998 90 555-55-55"); // значения контактов в журнал не попадают

    // Сброс пароля: временный пароль показывается один раз
    await page.getByTestId("reset-password").click();
    await page.getByTestId("confirm-reset").click();
    const temp = (await page.getByTestId("temp-password").textContent())!.trim();
    expect(temp).toMatch(/^[a-z2-9]{8}$/);
    expect(await db.auditLog.count({ where: { targetId: kid.id, action: "password_reset" } })).toBeGreaterThan(0);

    const ctx = await browser.newContext({ baseURL: info.project.use.baseURL });
    const kidPage = await ctx.newPage();
    await kidPage.goto("/login");
    await kidPage.fill("#login", who);
    await kidPage.fill("#password", "student123");
    await kidPage.click("button[type=submit]");
    await expect(kidPage.getByTestId("login-error")).toHaveText("Неверный логин или пароль");
    await kidPage.fill("#password", temp);
    await kidPage.click("button[type=submit]");
    await expect(kidPage).toHaveURL(/\/welcome/);
    // Ник у человека уже есть — мастер сразу просит новый пароль
    await expect(kidPage.getByTestId("wizard-password")).toBeVisible();
    await kidPage.locator("#w-next").fill("kid-new-pass1");
    await kidPage.locator("#w-confirm").fill("kid-new-pass1");
    await kidPage.getByRole("button", { name: "Дальше" }).click();
    await kidPage.getByTestId("wizard-finish").click();
    await expect(kidPage).toHaveURL(/\/student$/);
    await ctx.close();
    // Возвращаем известный пароль для остальных прогонов
    await db.user.update({ where: { id: kid.id }, data: { passwordHash: (await import("bcryptjs")).default.hashSync("student123", 10) } });
  });

  test("ученик и учитель не могут править профиль администратором (нет доступа к разделам)", async ({ page }) => {
    const kid = await db.student.findFirstOrThrow({ where: { user: { login: "student2" } } });
    await login(page, "teacher1", "teacher123");
    expect((await page.goto(`/admin/students/${kid.id}`))?.status()).toBe(403);
    expect((await page.request.get("/api/nickname?nick=abc")).status()).toBe(200);
  });
});
