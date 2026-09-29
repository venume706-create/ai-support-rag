import { describe, expect, it } from "vitest";
import { attentionReasons, type AttentionInput } from "@/lib/attention";
import { daysUntil, homeworkState } from "@/lib/homework-state";

const NOW = new Date("2026-09-29T00:00:00Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("homeworkState", () => {
  it("отметка учителя важнее срока", () => {
    expect(homeworkState(day(-5), NOW, "DONE").state).toBe("done");
    expect(homeworkState(day(-5), NOW, "PARTIAL").state).toBe("partial");
    expect(homeworkState(day(5), NOW, "NOT_DONE").state).toBe("overdue");
  });
  it("без отметки считается по сроку", () => {
    expect(homeworkState(day(-1), NOW).state).toBe("overdue");
    expect(homeworkState(day(0), NOW).state).toBe("today");
    expect(homeworkState(day(1), NOW).state).toBe("soon");
    expect(homeworkState(day(3), NOW).state).toBe("soon");
    expect(homeworkState(day(4), NOW).state).toBe("later");
  });
  it("считает дни", () => {
    expect(daysUntil(day(2), NOW)).toBe(2);
    expect(homeworkState(day(-2), NOW).daysLeft).toBe(-2);
  });
});

describe("attentionReasons", () => {
  const ok: AttentionInput = { rating: 80, attendance: [], homework: [], grades: [] };
  it("у благополучного ученика причин нет", () => {
    expect(attentionReasons({ ...ok, attendance: ["PRESENT", "ABSENT"], homework: ["DONE"], grades: [5, 4, 5] })).toEqual([]);
  });
  it("низкий рейтинг — ниже 50, «нет данных» не считается", () => {
    expect(attentionReasons({ ...ok, rating: 49.9 }).map((r) => r.code)).toEqual(["lowRating"]);
    expect(attentionReasons({ ...ok, rating: 50 })).toEqual([]);
    expect(attentionReasons({ ...ok, rating: null })).toEqual([]);
  });
  it("пропуски подряд: уважительные серию не рвут и не считаются", () => {
    expect(attentionReasons({ ...ok, attendance: ["ABSENT", "ABSENT", "PRESENT"] })).toEqual([{ code: "absences", value: 2 }]);
    expect(attentionReasons({ ...ok, attendance: ["ABSENT", "EXCUSED", "ABSENT"] })).toEqual([{ code: "absences", value: 2 }]);
    expect(attentionReasons({ ...ok, attendance: ["ABSENT", "PRESENT", "ABSENT"] })).toEqual([]);
    expect(attentionReasons({ ...ok, attendance: ["LATE", "ABSENT", "ABSENT"] })).toEqual([]);
  });
  it("ДЗ: два невыполненных из трёх последних", () => {
    expect(attentionReasons({ ...ok, homework: ["NOT_DONE", "DONE", "NOT_DONE"] })).toEqual([{ code: "homework", value: 2 }]);
    expect(attentionReasons({ ...ok, homework: ["NOT_DONE", "DONE", "DONE", "NOT_DONE"] })).toEqual([]);
  });
  it("оценки: средняя трёх последних ниже 3", () => {
    expect(attentionReasons({ ...ok, grades: [2, 3, 3] })).toEqual([{ code: "grades", value: 2.7 }]);
    expect(attentionReasons({ ...ok, grades: [2] })).toEqual([]);
    expect(attentionReasons({ ...ok, grades: [3, 3, 3] })).toEqual([]);
  });
});

import { monthGrid, monthKey, parseMonth, shiftMonth } from "@/lib/calendar";

describe("calendar", () => {
  it("разбирает месяц и отвергает мусор", () => {
    expect(parseMonth("2026-09")?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    for (const bad of ["", "2026-13", "2026-9", "abc", "2026-00", undefined]) expect(parseMonth(bad)).toBeNull();
  });
  it("листает месяцы через границу года", () => {
    expect(monthKey(shiftMonth(parseMonth("2026-01")!, -1))).toBe("2025-12");
    expect(monthKey(shiftMonth(parseMonth("2026-12")!, 1))).toBe("2027-01");
  });
  it("сетка: недели с понедельника, дни только своего месяца", () => {
    const weeks = monthGrid(parseMonth("2026-09")!); // 1 сентября 2026 — вторник
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]?.toISOString().slice(0, 10)).toBe("2026-09-01");
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.at(-1)!.filter(Boolean).at(-1)?.toISOString().slice(0, 10)).toBe("2026-09-30");
  });
});

import { describeDetails } from "@/lib/audit-view";

describe("describeDetails", () => {
  it("превращает правки в понятный текст", () => {
    expect(describeDetails(JSON.stringify({ nickname: ["Вася", "Петя"], phone: "изменено" }))).toBe("ник: Вася → Петя; телефон: изменено");
    expect(describeDetails(JSON.stringify({ role: "STUDENT", created: 3 }))).toBe("роль: STUDENT; создано: 3");
    expect(describeDetails(JSON.stringify({ bio: ["", "Привет"] }))).toBe("о себе: пусто → Привет");
  });
  it("не ломается на обычном тексте и пустоте", () => {
    expect(describeDetails("")).toBe("");
    expect(describeDetails("просто текст")).toBe("просто текст");
    expect(describeDetails("[1,2]")).toBe("[1,2]");
  });
});
