import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { addDays, toDateOnly, today } from "../../src/lib/dates";
import { db, login, logout, uid } from "./helpers";

test.describe("Ученик: новые возможности", () => {
  test("«Моё сегодня»: срочное задание видно с понятной меткой, подсказка «?» открывается", async ({ page }, info) => {
    const student = await db.student.findFirstOrThrow({ where: { user: { login: "student1" } }, include: { groups: true } });
    const groupId = student.groups[0].groupId;
    const title = uid("Срочно", info.project.name);
    const hw = await db.homework.create({ data: { groupId, title, dueDate: today() } });
    try {
      await login(page, "student1", "student123");
      const card = page.getByTestId("my-today");
      await expect(card).toBeVisible();
      const item = card.getByTestId("today-homework-list").locator("li", { hasText: title });
      await expect(item).toBeVisible();
      await expect(item.locator("[data-hw-state=today]")).toHaveText("Сдать сегодня");

      await card.getByTestId("hint-tip").click();
      await expect(page.getByRole("dialog")).toContainText("главное на сегодня");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } finally {
      await db.homework.delete({ where: { id: hw.id } });
    }
  });

  test("ДЗ: статусы и фильтр «Просрочены» / «Сделаны»", async ({ page }, info) => {
    const student = await db.student.findFirstOrThrow({ where: { user: { login: "student1" } }, include: { groups: true } });
    const groupId = student.groups[0].groupId;
    const late = uid("Долг", info.project.name);
    const done = uid("Готово", info.project.name);
    const hwLate = await db.homework.create({ data: { groupId, title: late, dueDate: addDays(today(), -2) } });
    const hwDone = await db.homework.create({ data: { groupId, title: done, dueDate: addDays(today(), 5) } });
    await db.homeworkSubmission.create({ data: { homeworkId: hwDone.id, studentId: student.id, status: "DONE" } });
    try {
      await login(page, "student1", "student123");
      await page.goto(`/student/homework?q=${encodeURIComponent(late)}`);
      const note = page.getByTestId("homework-note").filter({ hasText: late });
      await expect(note.locator("[data-hw-state=overdue]")).toHaveText("Просрочено");
      await expect(note).toContainText("просрочено на 2 дня");

      await page.goto(`/student/homework?q=${encodeURIComponent(late)}&hw=overdue`);
      await expect(page.getByTestId("homework-note").filter({ hasText: late })).toBeVisible();
      await page.goto(`/student/homework?q=${encodeURIComponent(late)}&hw=done`);
      await expect(page.getByTestId("homework-note")).toHaveCount(0);

      await page.goto(`/student/homework?q=${encodeURIComponent(done)}&hw=done`);
      await expect(page.getByTestId("homework-note").filter({ hasText: done }).locator("[data-hw-state=done]")).toHaveText("Сделано");
      // Кнопки фильтра работают как ссылки
      await page.getByTestId("hw-filter").getByRole("link", { name: "Просрочены" }).click();
      await expect(page).toHaveURL(/hw=overdue/);
      await expect(page.getByTestId("homework-note").filter({ hasText: done })).toHaveCount(0);
    } finally {
      await db.homework.deleteMany({ where: { id: { in: [hwLate.id, hwDone.id] } } });
    }
  });

  test("календарь посещаемости: день окрашен по отметке, месяцы листаются", async ({ page }) => {
    const student = await db.student.findFirstOrThrow({ where: { user: { login: "student1" } } });
    const last = await db.attendance.findFirstOrThrow({ where: { studentId: student.id }, orderBy: { lesson: { date: "desc" } }, include: { lesson: true } });
    const day = toDateOnly(last.lesson.date);
    const sameDay = await db.attendance.findMany({ where: { studentId: student.id, lesson: { date: last.lesson.date } } });
    const worst = (["ABSENT", "LATE", "EXCUSED", "PRESENT"] as const).find((s) => sameDay.some((a) => a.status === s))!;

    await login(page, "student1", "student123");
    await page.goto(`/student/attendance?month=${day.slice(0, 7)}`);
    const cal = page.getByTestId("attendance-calendar");
    await expect(cal).toHaveAttribute("data-month", day.slice(0, 7));
    await expect(cal.locator(`[data-day="${day}"]`)).toHaveAttribute("data-status", worst);

    await cal.getByRole("link", { name: "Предыдущий месяц" }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
    await expect(page.getByTestId("attendance-calendar")).not.toHaveAttribute("data-month", day.slice(0, 7));
    // Мусор в адресе не ломает страницу
    await page.goto("/student/attendance?month=zzz");
    await expect(page.getByTestId("attendance-calendar")).toBeVisible();
  });
});

test.describe("Учитель: «Кому нужно внимание» и заметки", () => {
  test("ученик с двумя пропусками подряд попадает в список с понятной причиной", async ({ page }, info) => {
    const teacher = await db.teacher.findFirstOrThrow({ where: { user: { login: "teacher1" } }, include: { groups: true } });
    const group = teacher.groups[0];
    const lessons = await db.lesson.findMany({ where: { groupId: group.id, date: { lt: today() } }, orderBy: { date: "desc" }, take: 2 });
    expect(lessons.length).toBe(2);
    const nick = uid("Пропуск", info.project.name);
    const user = await db.user.create({
      data: {
        login: nick.toLowerCase(),
        passwordHash: bcrypt.hashSync("x-pass-12", 4),
        role: "STUDENT",
        firstName: "Пропуск",
        lastName: "Тестов",
        fullName: "Пропуск Тестов",
        nickname: nick,
        nicknameKey: nick.toLowerCase(),
        searchKey: nick.toLowerCase(),
        student: { create: { groups: { create: { groupId: group.id } } } },
      },
      include: { student: true },
    });
    try {
      await db.attendance.createMany({ data: lessons.map((l) => ({ lessonId: l.id, studentId: user.student!.id, status: "ABSENT" as const })) });
      await login(page, "teacher1", "teacher123");
      const row = page.getByTestId("attention-row").filter({ hasText: nick });
      await expect(row).toBeVisible();
      await expect(row.locator("[data-reason=absences]")).toHaveText("Пропустил занятий подряд: 2");
      await row.getByRole("link").first().click();
      await expect(page).toHaveURL(new RegExp(`/teacher/students/${user.student!.id}`));
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });

  test("заметка: добавить, увидеть, удалить с подтверждением; админ видит её только для чтения", async ({ page }, info) => {
    const teacher = await db.teacher.findFirstOrThrow({ where: { user: { login: "teacher1" } }, include: { groups: { include: { students: true } } } });
    const studentId = teacher.groups[0].students[0].studentId;
    const text = uid("Договорились подтянуть дроби ", info.project.name);

    await login(page, "teacher1", "teacher123");
    await page.goto(`/teacher/students/${studentId}`);
    await page.getByTestId("note-text").fill(text);
    await page.getByTestId("note-add").click();
    await expect(page.getByText("Заметка сохранена").first()).toBeVisible();
    const note = page.getByTestId("note").filter({ hasText: text });
    await expect(note).toBeVisible();
    expect(await db.teacherNote.count({ where: { studentId, text } })).toBe(1);

    // Админ видит заметку с автором и не может её менять
    await logout(page);
    await login(page, "admin", "admin123");
    await page.goto(`/admin/students/${studentId}`);
    const adminNote = page.getByTestId("student-notes").getByTestId("note").filter({ hasText: text });
    await expect(adminNote).toContainText("Автор");
    await expect(page.getByTestId("note-add")).toHaveCount(0);
    await expect(adminNote.getByRole("button")).toHaveCount(0);

    // Удаление — только после подтверждения
    await logout(page);
    await login(page, "teacher1", "teacher123");
    await page.goto(`/teacher/students/${studentId}`);
    await page.getByTestId("note").filter({ hasText: text }).getByRole("button", { name: "Удалить" }).click();
    await expect(page.getByRole("dialog")).toContainText("Удалить заметку?");
    await page.getByRole("dialog").getByRole("button", { name: "Отмена" }).click();
    expect(await db.teacherNote.count({ where: { studentId, text } })).toBe(1);
    await page.getByTestId("note").filter({ hasText: text }).getByRole("button", { name: "Удалить" }).click();
    await page.getByTestId("confirm-action").click();
    await expect(page.getByTestId("note").filter({ hasText: text })).toHaveCount(0);
    expect(await db.teacherNote.count({ where: { studentId, text } })).toBe(0);
  });

  test("оценку удаляют только после подтверждения", async ({ page }) => {
    const teacher = await db.teacher.findFirstOrThrow({ where: { user: { login: "teacher1" } }, include: { groups: true } });
    const group = teacher.groups[0];
    const lesson = await db.lesson.findFirstOrThrow({ where: { groupId: group.id, date: { lt: today() } }, orderBy: { date: "desc" } });
    const member = await db.groupStudent.findFirstOrThrow({ where: { groupId: group.id } });
    await login(page, "teacher1", "teacher123");
    await page.goto(`/teacher/groups/${group.id}?lesson=${lesson.id}`);
    const grades = page.getByTestId(`grades-${member.studentId}`);
    const before = await db.grade.count({ where: { lessonId: lesson.id, studentId: member.studentId } });
    await grades.locator("button[data-grade-key='3']").click();
    await expect(page.getByText("Оценка сохранена").first()).toBeVisible();
    await expect.poll(() => db.grade.count({ where: { lessonId: lesson.id, studentId: member.studentId } })).toBe(before + 1);

    await grades.getByRole("button", { name: /Удалить оценку \d/ }).last().click();
    await expect(page.getByRole("dialog")).toContainText("Удалить оценку?");
    await page.getByRole("dialog").getByRole("button", { name: "Отмена" }).click();
    expect(await db.grade.count({ where: { lessonId: lesson.id, studentId: member.studentId } })).toBe(before + 1);
    await grades.getByRole("button", { name: /Удалить оценку \d/ }).last().click();
    await page.getByTestId("confirm-action").click();
    await expect.poll(() => db.grade.count({ where: { lessonId: lesson.id, studentId: member.studentId } })).toBe(before);
  });
});

test.describe("Администратор: цифры и журнал", () => {
  test("на главной ключевые цифры и последние действия; журнал открывается, фильтруется, доступен только админу", async ({ page }) => {
    await login(page, "admin", "admin123");
    await expect(page.getByTestId("admin-key-numbers")).toBeVisible();
    await expect(page.getByTestId("recent-actions")).toBeVisible();

    // Создадим запись в журнале: смена предмета уже покрыта в других тестах, здесь — сброс пароля не нужен;
    // достаточно записи, добавленной напрямую этим же сценарием через БД
    const marker = uid("тест", "j");
    await db.auditLog.create({ data: { actorLabel: "Админ", action: "group_created", targetType: "group", targetLabel: marker, details: JSON.stringify({ name: marker }) } });
    await page.goto(`/admin/journal?q=${marker}`);
    const row = page.getByTestId("audit-row").filter({ hasText: marker });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Создана группа");
    await page.goto(`/admin/journal?q=${marker}&action=user_deleted`);
    await expect(page.getByTestId("audit-row")).toHaveCount(0);
    await expect(page.getByTestId("empty-state")).toBeVisible();

    await logout(page);
    await login(page, "teacher1", "teacher123");
    const res = await page.goto("/admin/journal");
    expect(res?.status()).toBe(403);
  });
});
