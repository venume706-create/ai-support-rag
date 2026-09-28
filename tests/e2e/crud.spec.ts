import { expect, test } from "@playwright/test";
import { db, login, uid } from "./helpers";

test.describe("Остальные действия сохраняются в БД", () => {
  test("учитель: ДЗ, отметка выполнения и тема урока", async ({ page }, info) => {
    const group = await db.group.findFirstOrThrow({ where: { teacher: { user: { login: "teacher1" } } }, include: { students: true } });
    const title = `ДЗ ${uid("hw", info.project.name)}`;
    await login(page, "teacher1", "teacher123");

    await page.goto(`/teacher/groups/${group.id}?tab=homework`);
    await page.getByTestId("new-homework").click();
    const form = page.getByTestId("homework-form");
    await form.getByLabel("Название").fill(title);
    await form.getByLabel("Описание").fill("Упражнения 1–5");
    await form.locator("button[type=submit]").click();
    await expect(form).toBeHidden();
    const note = page.getByTestId("homework-note").filter({ hasText: title });
    await expect(note).toBeVisible();

    const hw = await db.homework.findFirstOrThrow({ where: { title } });
    const studentId = group.students[0].studentId;
    await note.locator("summary").click();
    const stamps = note.getByTestId(`submission-${hw.id}-${studentId}`);
    await stamps.getByRole("button", { name: /Выполнено/ }).click();
    await expect(stamps.getByRole("button", { name: /Выполнено/ })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await db.homeworkSubmission.findUnique({ where: { homeworkId_studentId: { homeworkId: hw.id, studentId } } }))?.status).toBe("DONE");

    // Тема урока
    const lesson = await db.lesson.findFirstOrThrow({ where: { groupId: group.id, date: { lt: new Date() } }, orderBy: { date: "desc" } });
    const topic = `Тема ${title}`;
    await page.goto(`/teacher/groups/${group.id}?lesson=${lesson.id}`);
    await page.getByTestId("topic-form").getByLabel("Тема").fill(topic);
    await page.getByTestId("topic-form").locator("button[type=submit]").click();
    await expect.poll(async () => (await db.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).topic).toBe(topic);

    // Удаление задания
    await page.goto(`/teacher/groups/${group.id}?tab=homework`);
    await page.getByTestId("homework-note").filter({ hasText: title }).getByRole("button", { name: "Удалить" }).click();
    await page.getByTestId("confirm-action").click();
    await expect(page.getByTestId("homework-note").filter({ hasText: title })).toHaveCount(0);
    expect(await db.homework.count({ where: { title } })).toBe(0);
  });

  test("админ: слот расписания, состав группы, предметы", async ({ page }, info) => {
    const group = await db.group.findFirstOrThrow({ where: { name: "English Advanced" }, include: { students: { include: { student: { include: { user: true } } } } } });
    await login(page, "admin", "admin123");
    await page.goto(`/admin/groups/${group.id}`);

    // Слот (воскресенье — у группы в этот день занятий нет)
    const room = info.project.name === "mobile" ? "M-7" : "D-7";
    await page.getByTestId("new-slot").click();
    const sf = page.getByTestId("slot-form");
    await sf.locator("#sl-day").selectOption("7");
    await sf.locator("#sl-start").fill(info.project.name === "mobile" ? "09:00" : "11:00");
    await sf.locator("#sl-end").fill(info.project.name === "mobile" ? "10:30" : "12:30");
    await sf.locator("#sl-room").fill(room);
    await sf.locator("button[type=submit]").click();
    await expect(sf).toBeHidden();
    await expect(page.getByTestId("group-slots")).toContainText(room);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const slot = await db.scheduleSlot.findFirstOrThrow({ where: { groupId: group.id, room } });
    expect(await db.lesson.count({ where: { groupId: group.id, startTime: slot.startTime } })).toBeGreaterThan(0);

    // Время окончания раньше начала — ошибка валидации
    await page.getByTestId("new-slot").click();
    await page.locator("#sl-start").fill("18:00");
    await page.locator("#sl-end").fill("17:00");
    await page.getByTestId("slot-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("error-sl-end")).toHaveText("Время окончания должно быть позже начала");
    await page.keyboard.press("Escape");

    // Убрать ученика из группы и вернуть обратно
    const member = group.students[info.project.name === "mobile" ? 1 : 0].student;
    await page.getByTestId("group-students").getByRole("row").filter({ hasText: member.user.fullName }).getByRole("button", { name: "Убрать" }).click();
    await page.getByTestId("confirm-action").click();
    await expect(page.getByTestId("group-students")).not.toContainText(member.user.fullName);
    await page.getByTestId("membership-form").locator("select").selectOption(member.id);
    await page.getByTestId("membership-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("group-students")).toContainText(member.user.fullName);

    // Предмет: создать, переименовать, удалить
    const subject = `Физика ${uid("s", info.project.name)}`;
    await page.goto("/admin/groups");
    await page.getByPlaceholder("Название предмета").fill(subject);
    await page.getByRole("button", { name: "Добавить" }).click();
    await expect(page.locator(`input[value="${subject}"]`)).toBeVisible();
    expect(await db.subject.count({ where: { name: subject } })).toBe(1);
    const row = page.locator("li").filter({ has: page.locator(`input[value="${subject}"]`) });
    await row.getByRole("button", { name: "Удалить" }).click();
    await page.getByTestId("confirm-action").click();
    await expect(page.locator(`input[value="${subject}"]`)).toHaveCount(0);
    expect(await db.subject.count({ where: { name: subject } })).toBe(0);
  });
});
