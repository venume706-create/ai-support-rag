import { expect, test } from "@playwright/test";
import { completeWizard, db, login, uid, logout } from "./helpers";

test.describe("Администратор", () => {
  test("создаёт учителя, группу и ученика и видит их в списках", async ({ page }, info) => {
    const teacherLogin = uid("teach", info.project.name);
    const studentLogin = uid("stud", info.project.name);
    const teacherFirst = "Тест";
    const teacherLast = `Учитель${teacherLogin.slice(-4)}`;
    const teacherName = `${teacherFirst} ${teacherLast}`;
    const studentFirst = "Тест";
    const studentLast = `Ученик${studentLogin.slice(-4)}`;
    const studentName = `${studentFirst} ${studentLast}`;
    const groupName = `Группа ${teacherLogin}`;

    await login(page, "admin", "admin123");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId("stat-card")).toHaveCount(8);

    // Учитель
    await page.goto("/admin/teachers");
    await page.getByTestId("new-teacher").click();
    const tf = page.getByTestId("teacher-form");
    await tf.locator("#t-firstName").fill(teacherFirst);
    await tf.locator("#t-lastName").fill(teacherLast);
    await tf.locator("#t-login").fill(teacherLogin);
    await tf.locator("#t-password").fill("secret123");
    await tf.getByLabel("Математика").check();
    await tf.locator("button[type=submit]").click();
    await expect(tf).toBeHidden();
    await page.goto(`/admin/teachers?q=${teacherLogin}`);
    await expect(page.getByTestId("teachers-table")).toContainText(teacherName);

    // Группа с этим учителем
    await page.goto("/admin/groups");
    await page.getByTestId("new-group").click();
    const gf = page.getByTestId("group-form");
    await gf.locator("#g-name").fill(groupName);
    await gf.locator("#g-subject").selectOption({ label: "Математика" });
    await gf.locator("#g-level").fill("A2");
    const teacher = await db.teacher.findFirstOrThrow({ where: { user: { login: teacherLogin } } });
    await gf.locator("#g-teacher").selectOption(teacher.id);
    await gf.locator("button[type=submit]").click();
    await expect(gf).toBeHidden();
    await page.goto(`/admin/groups?q=${encodeURIComponent(groupName)}`);
    await expect(page.getByTestId("groups-table")).toContainText(groupName);
    await expect(page.getByTestId("groups-table")).toContainText(teacherName);

    // Ученик сразу в этой группе
    await page.goto("/admin/students");
    await page.getByTestId("new-student").click();
    const sf = page.getByTestId("student-form");
    await sf.locator("#s-firstName").fill(studentFirst);
    await sf.locator("#s-lastName").fill(studentLast);
    await sf.locator("#s-login").fill(studentLogin);
    await sf.locator("#s-password").fill("secret123");
    await sf.locator("#s-parentPhone").fill("+998 90 123-45-67");
    await sf.getByLabel(groupName).check();
    await sf.locator("button[type=submit]").click();
    await expect(sf).toBeHidden();
    await page.goto(`/admin/students?q=${studentLogin}`);
    await expect(page.getByTestId("students-table")).toContainText(studentName);
    await expect(page.getByTestId("students-table")).toContainText(groupName);

    // Данные действительно в БД
    const group = await db.group.findUniqueOrThrow({ where: { name: groupName }, include: { students: { include: { student: { include: { user: true } } } } } });
    expect(group.teacherId).toBe(teacher.id);
    expect(group.students.map((s) => s.student.user.login)).toContain(studentLogin);

    // Новый учитель входит с временным паролем и проходит мастер, после чего видит свою группу
    await logout(page);
    await login(page, teacherLogin, "secret123");
    await completeWizard(page, `Учитель_${teacherLogin.slice(-4)}`, "my-own-pass1");
    await expect(page.getByTestId("my-groups")).toContainText(groupName);
    const fresh = await db.user.findUniqueOrThrow({ where: { login: teacherLogin } });
    expect(fresh.mustChangePassword).toBe(false);
    expect(fresh.nickname).toBe(`Учитель_${teacherLogin.slice(-4)}`);
  });

  test("валидация: занятый логин не принимается", async ({ page }) => {
    await login(page, "admin", "admin123");
    await page.goto("/admin/students");
    await page.getByTestId("new-student").click();
    const sf = page.getByTestId("student-form");
    await sf.locator("#s-firstName").fill("Дубликат");
    await sf.locator("#s-lastName").fill("Логина");
    await sf.locator("#s-login").fill("student1");
    await sf.locator("#s-password").fill("secret123");
    await sf.locator("button[type=submit]").click();
    await expect(page.getByTestId("error-s-login")).toHaveText("Этот логин уже занят");
    // Введённые данные не теряются после ошибки
    await expect(sf.locator("#s-firstName")).toHaveValue("Дубликат");
    await expect(sf.locator("#s-lastName")).toHaveValue("Логина");
    await expect(sf.locator("#s-login")).toHaveValue("student1");
  });

  test("отключённый пользователь не может войти", async ({ page, browser }, info) => {
    const target = info.project.name === "mobile" ? "student29" : "student30";
    const student = await db.student.findFirstOrThrow({ where: { user: { login: target } } });
    await login(page, "admin", "admin123");
    await page.goto(`/admin/students/${student.id}`);
    await page.getByTestId("toggle-active").click();
    await page.getByTestId("confirm-action").click();
    await expect(page.getByText("Аккаунт заблокирован").first()).toBeVisible();

    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await other.goto(`${info.project.use.baseURL}/login`);
    await other.fill("#login", target);
    await other.fill("#password", "student123");
    await other.click("button[type=submit]");
    await expect(other.getByTestId("login-error")).toHaveText("Аккаунт заблокирован. Обратитесь к администратору.");
    await ctx.close();
    await db.user.update({ where: { login: target }, data: { isActive: true } });
  });
});
