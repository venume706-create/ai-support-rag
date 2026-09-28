import { expect, test } from "@playwright/test";
import { db, login, ratingTotal } from "./helpers";

test.describe("Учитель", () => {
  test("отмечает посещаемость и ставит оценку — рейтинг ученика меняется", async ({ page }, info) => {
    const teacher = await db.teacher.findFirstOrThrow({ where: { user: { login: "teacher1" } }, include: { groups: true } });
    const group = teacher.groups[info.project.name === "mobile" ? 1 : 0];
    // Прошедший урок группы и ученик, у которого на этом уроке не «был»
    const lessons = await db.lesson.findMany({
      where: { groupId: group.id, date: { lt: new Date() } },
      orderBy: { date: "desc" },
      include: { attendance: true },
      take: 5,
    });
    const members = await db.groupStudent.findMany({ where: { groupId: group.id } });
    let lessonId = "";
    let studentId = "";
    for (const l of lessons) {
      const m = members.find((mm) => l.attendance.find((a) => a.studentId === mm.studentId)?.status !== "PRESENT");
      if (m) {
        lessonId = l.id;
        studentId = m.studentId;
        break;
      }
    }
    expect(lessonId).not.toBe("");

    await login(page, "teacher1", "teacher123");
    await expect(page.getByTestId("teacher-rating")).toBeVisible();
    const before = await ratingTotal(page, studentId);

    await page.goto(`/teacher/groups/${group.id}?lesson=${lessonId}`);
    const row = page.getByTestId(`attendance-${studentId}`);
    await row.locator("button[data-status=PRESENT]").click();
    await expect(row.locator("button[data-status=PRESENT]")).toHaveAttribute("aria-pressed", "true");
    await expect(row.getByLabel("Сохранено")).toBeVisible();

    const grades = page.getByTestId(`grades-${studentId}`);
    await grades.locator("button[data-grade-key='5']").click();
    await expect(grades.locator("[data-grade='5']").last()).toBeVisible();
    await expect(page.getByText("Оценка сохранена").first()).toBeVisible();

    // Данные сохранены в БД
    const att = await db.attendance.findUniqueOrThrow({ where: { lessonId_studentId: { lessonId, studentId } } });
    expect(att.status).toBe("PRESENT");
    expect(await db.grade.count({ where: { lessonId, studentId, value: 5 } })).toBeGreaterThan(0);

    const after = await ratingTotal(page, studentId);
    expect(before).not.toBeNull();
    expect(after!).toBeGreaterThan(before!);

    // Изменение видно и в интерфейсе профиля ученика
    await page.goto(`/teacher/students/${studentId}`);
    await expect(page.getByTestId("rating-total")).toHaveText(after!.toFixed(1));
  });

  test("не может открыть чужую группу и чужого ученика — 403", async ({ page }) => {
    const foreign = await db.group.findFirstOrThrow({ where: { teacher: { user: { login: "teacher2" } } } });
    const own = await db.group.findMany({ where: { teacher: { user: { login: "teacher1" } } }, select: { id: true } });
    const foreignOnly = await db.student.findFirstOrThrow({ where: { groups: { none: { groupId: { in: own.map((g) => g.id) } } } } });

    await login(page, "teacher1", "teacher123");
    const res = await page.goto(`/teacher/groups/${foreign.id}`);
    expect(res?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: "Доступ запрещён" })).toBeVisible();

    const res2 = await page.goto(`/teacher/students/${foreignOnly.id}`);
    expect(res2?.status()).toBe(403);

    expect((await page.request.get(`/api/groups/${foreign.id}`)).status()).toBe(403);
    expect((await page.request.get(`/api/students/${foreignOnly.id}/rating`)).status()).toBe(403);

    // Раздел администратора
    const res3 = await page.goto("/admin");
    expect(res3?.status()).toBe(403);
  });
});
