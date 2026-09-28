import { describe, expect, it } from "vitest";
import { addDays, isoDayOfWeek, parseDateOnly, startOfWeek, toDateOnly } from "@/lib/dates";
import { planLessons } from "@/lib/lessons";

describe("генерация уроков из расписания", () => {
  it("создаёт уроки только в дни слотов", () => {
    const monday = parseDateOnly("2026-09-28");
    const slots = [
      { groupId: "g", dayOfWeek: 1, startTime: "15:00", endTime: "16:30" },
      { groupId: "g", dayOfWeek: 3, startTime: "15:00", endTime: "16:30" },
    ];
    const lessons = planLessons(slots, monday, addDays(monday, 13));
    expect(lessons.map((l) => toDateOnly(l.date))).toEqual(["2026-09-28", "2026-09-30", "2026-10-05", "2026-10-07"]);
  });

  it("неделя начинается с понедельника, воскресенье — 7-й день", () => {
    const sunday = parseDateOnly("2026-10-04");
    expect(isoDayOfWeek(sunday)).toBe(7);
    expect(toDateOnly(startOfWeek(sunday))).toBe("2026-09-28");
  });
});
