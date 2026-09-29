import { describe, expect, it } from "vitest";
import { evaluateAchievements, type AchievementInput } from "@/lib/achievements";
import { addDays, parseDateOnly } from "@/lib/dates";
import { assignPlaces, placeOf } from "@/lib/leaderboard";
import { RANKS, nextRank, pointsToNext, rankOf, rankProgress } from "@/lib/ranks";
import { calculateStudentRating, calculateTeacherAggregates, type AttendanceMark, type HomeworkMark } from "@/lib/rating";
import { ratingAsOf, weeklyDelta, weeklySeries, type RatingRecords } from "@/lib/rating-history";
import { ratingTips } from "@/lib/rating-tips";

const TODAY = parseDateOnly("2026-09-28");
const day = (offset: number) => addDays(TODAY, offset);

describe("ранги", () => {
  it("шесть рангов в порядке возрастания порогов", () => {
    expect(RANKS.map((r) => r.code)).toEqual(["novice", "student", "advanced", "honor", "master", "legend"]);
    expect(RANKS.map((r) => r.min)).toEqual([...RANKS.map((r) => r.min)].sort((a, b) => a - b));
  });
  it("границы: порог включается в свой ранг", () => {
    const at = (t: number) => rankOf(t).code;
    expect([at(0), at(29.9), at(30), at(49.9), at(50), at(69.9), at(70), at(84.9), at(85), at(94.9), at(95), at(100)]).toEqual([
      "novice", "novice", "student", "student", "advanced", "advanced", "honor", "honor", "master", "master", "legend", "legend",
    ]);
  });
  it("нет данных → «Новичок», без следующего ранга у Легенды", () => {
    expect(rankOf(null).code).toBe("novice");
    expect(nextRank(100)).toBeNull();
    expect(pointsToNext(100)).toBeNull();
    expect(nextRank(null)?.code).toBe("student");
  });
  it("сколько баллов до следующего ранга (округление вверх до 0.1)", () => {
    expect(pointsToNext(66.4)).toBe(3.6);
    expect(pointsToNext(69.95)).toBe(0.1);
    expect(pointsToNext(50)).toBe(20);
    expect(pointsToNext(null)).toBe(30);
  });
  it("прогресс внутри ранга от 0 до 1", () => {
    expect(rankProgress(50)).toBe(0);
    expect(rankProgress(60)).toBe(0.5);
    expect(rankProgress(100)).toBe(1);
  });
});

function records(over: Partial<RatingRecords> = {}): RatingRecords {
  return { grades: [], attendance: [], homework: [], ...over };
}

describe("история рейтинга: рейтинг «на дату»", () => {
  const r = records({
    grades: [
      { date: day(-20), value: 3 },
      { date: day(-3), value: 5 },
    ],
    attendance: [
      { date: day(-20), status: "ABSENT" },
      { date: day(-3), status: "PRESENT" },
    ],
    homework: [
      { dueDate: day(-15), status: "NOT_DONE" },
      { dueDate: day(-2), status: "DONE" },
      { dueDate: day(5), status: "DONE" }, // отмечено заранее
      { dueDate: day(6), status: null }, // ещё не срок
    ],
  });

  it("на прошлую дату видны только события до неё", () => {
    const old = ratingAsOf(r, day(-10));
    expect(old.grades.count).toBe(1);
    expect(old.grades.average).toBe(3);
    expect(old.attendance.counted).toBe(1);
    expect(old.homework.count).toBe(1); // только ДЗ №1 (срок -15)
  });

  it("сегодня с includeFutureMarked совпадает с прямым расчётом по тем же данным", () => {
    const direct = calculateStudentRating({
      grades: [3, 5],
      attendance: ["ABSENT", "PRESENT"],
      homework: ["NOT_DONE", "DONE", "DONE"], // ДЗ со сроком +6 без отметки не считается
    });
    expect(ratingAsOf(r, TODAY, { includeFutureMarked: true }).total).toBe(direct.total);
  });

  it("без includeFutureMarked отмеченное заранее ДЗ в историю не попадает", () => {
    expect(ratingAsOf(r, TODAY).homework.count).toBe(2);
  });

  it("неотмеченное ДЗ со сроком в день даты ещё не считается (срок не прошёл)", () => {
    const x = records({ homework: [{ dueDate: day(0), status: null }] });
    expect(ratingAsOf(x, TODAY).homework.count).toBe(0);
    expect(ratingAsOf(x, day(1)).homework.count).toBe(1);
  });

  it("до первых данных итог null", () => {
    expect(ratingAsOf(r, day(-30)).total).toBeNull();
  });
});

describe("динамика и график за 8 недель", () => {
  it("8 точек, последняя — сегодня, интервал 7 дней", () => {
    const s = weeklySeries(records({ grades: [{ date: day(-60), value: 4 }] }), TODAY, 8);
    expect(s).toHaveLength(8);
    expect(s[7].date.getTime()).toBe(TODAY.getTime());
    expect(s[6].date.getTime()).toBe(day(-7).getTime());
    expect(s.every((p) => p.total === 80)).toBe(true);
  });

  it("ранние точки без данных — null (график покажет разрыв)", () => {
    const s = weeklySeries(records({ grades: [{ date: day(-3), value: 5 }] }), TODAY, 8);
    expect(s.slice(0, 7).every((p) => p.total === null)).toBe(true);
    expect(s[7].total).toBe(100);
  });

  it("за неделю: сейчас минус 7 дней назад, округление до 0.1", () => {
    const r = records({
      grades: [
        { date: day(-30), value: 4 },
        { date: day(-2), value: 5 },
      ],
    });
    // было 4 → 80.0; стало (4+5)/2 = 4.5 → 90.0
    expect(weeklyDelta(r, TODAY)).toBe(10);
  });

  it("отрицательная динамика и «нет данных неделю назад»", () => {
    expect(weeklyDelta(records({ grades: [{ date: day(-30), value: 5 }, { date: day(-1), value: 2 }] }), TODAY)).toBe(-30);
    expect(weeklyDelta(records({ grades: [{ date: day(-1), value: 5 }] }), TODAY)).toBeNull();
  });
});

describe("места в рейтинге", () => {
  it("равные баллы — одно место, следующее пропускается (1, 2, 2, 4)", () => {
    const placed = assignPlaces([
      { id: "a", total: 90 },
      { id: "b", total: 80 },
      { id: "c", total: 80 },
      { id: "d", total: 70 },
    ]);
    expect(placed.map((p) => [p.item.id, p.place])).toEqual([["a", 1], ["b", 2], ["c", 2], ["d", 4]]);
  });
  it("без данных (null) в доску не попадают", () => {
    expect(assignPlaces([{ id: "a", total: null }, { id: "b", total: 10 }]).map((p) => p.item.id)).toEqual(["b"]);
  });
  it("место конкретного человека и число участников", () => {
    const rows = [{ id: "a", total: 90 }, { id: "b", total: 80 }, { id: "c", total: 70 }];
    expect(placeOf(rows, "b")).toEqual({ place: 2, of: 3 });
    expect(placeOf(rows, "zzz")).toBeNull();
    expect(placeOf([{ id: "a", total: null }], "a")).toBeNull();
  });
});

describe("подсказки: что быстрее всего поднимет рейтинг", () => {
  it("даёт три действия по убыванию пользы, польза — по настоящим формулам", () => {
    const input = { grades: [5, 5, 5, 5], attendance: ["PRESENT", "PRESENT", "PRESENT", "PRESENT"] as AttendanceMark[], homework: ["NOT_DONE", "NOT_DONE"] as HomeworkMark[] };
    const tips = ratingTips(input);
    expect(tips).toHaveLength(3);
    expect(tips.map((t) => t.gain)).toEqual([...tips.map((t) => t.gain)].sort((a, b) => b - a));
    // Оценки и посещаемость уже идеальны — сдать ДЗ выгоднее всего
    expect(tips[0].action).toBe("homework");
    const before = calculateStudentRating(input).total!;
    const after = calculateStudentRating({ ...input, homework: [...input.homework, "DONE"] }).total!;
    expect(tips[0].gain).toBe(Math.round((after - before) * 10) / 10);
    expect(tips.find((t) => t.action === "grade5")!.gain).toBe(0);
  });
  it("слабые оценки — пятёрка полезнее всего", () => {
    const tips = ratingTips({ grades: [2, 2, 3], attendance: ["PRESENT", "PRESENT"], homework: ["DONE", "DONE"] });
    expect(tips[0].action).toBe("grade5");
  });
  it("работает и совсем без данных", () => {
    const tips = ratingTips({ grades: [], attendance: [], homework: [] });
    expect(tips.every((t) => t.gain >= 0)).toBe(true);
  });
});

function ach(over: Partial<AchievementInput> = {}): AchievementInput {
  return { today: TODAY, grades: [], attendance: [], homework: [], bestPlace: null, weeklyDelta: null, ...over };
}
const fives = (n: number) => Array.from({ length: n }, (_, i) => ({ date: day(-n + i), value: 5 }));
const marks = (n: number, status: AttendanceMark = "PRESENT", from = -1) => Array.from({ length: n }, (_, i) => ({ date: day(from - i), status }));
const hw = (n: number, status: HomeworkMark | null = "DONE") => Array.from({ length: n }, (_, i) => ({ dueDate: day(-2 - i * 3), status }));

describe("достижения", () => {
  it("«Первая пятёрка»", () => {
    expect(evaluateAchievements(ach({ grades: [{ date: day(-1), value: 4 }] }))).toEqual([]);
    expect(evaluateAchievements(ach({ grades: [{ date: day(-1), value: 5 }] }))).toContain("first_five");
  });
  it("«5 пятёрок подряд»: четыре — мало, серию рвёт любая не-пятёрка", () => {
    expect(evaluateAchievements(ach({ grades: fives(4) }))).not.toContain("five_streak");
    expect(evaluateAchievements(ach({ grades: fives(5) }))).toContain("five_streak");
    const broken = [...fives(3), { date: day(-1), value: 4 }, ...fives(3).map((g) => ({ ...g, date: day(0) }))];
    expect(evaluateAchievements(ach({ grades: broken }))).not.toContain("five_streak");
  });
  it("«Без пропусков месяц»: нужно ≥4 отметок за 30 дней и ни одного прогула", () => {
    expect(evaluateAchievements(ach({ attendance: marks(3) }))).not.toContain("no_absence_month");
    expect(evaluateAchievements(ach({ attendance: marks(4) }))).toContain("no_absence_month");
    expect(evaluateAchievements(ach({ attendance: [...marks(6), ...marks(1, "ABSENT", -5)] }))).not.toContain("no_absence_month");
  });
  it("опоздание не прогул, уважительная причина не в счёт", () => {
    expect(evaluateAchievements(ach({ attendance: [...marks(3, "LATE"), ...marks(2, "EXCUSED", -10)] }))).not.toContain("no_absence_month"); // всего 3 в счёт
    expect(evaluateAchievements(ach({ attendance: [...marks(4, "LATE"), ...marks(3, "EXCUSED", -10)] }))).toContain("no_absence_month");
  });
  it("прогул старше 30 дней не мешает «Без пропусков месяц», но мешает «Ни одного прогула»", () => {
    const att = [...marks(12, "PRESENT", -1), ...marks(1, "ABSENT", -60)];
    const got = evaluateAchievements(ach({ attendance: att }));
    expect(got).toContain("no_absence_month");
    expect(got).not.toContain("perfect_attendance");
    expect(evaluateAchievements(ach({ attendance: marks(12) }))).toContain("perfect_attendance");
  });
  it("«Все ДЗ вовремя» и «Три ДЗ подряд»", () => {
    expect(evaluateAchievements(ach({ homework: hw(2) }))).toEqual([]);
    expect(evaluateAchievements(ach({ homework: hw(3) }))).toEqual(expect.arrayContaining(["homework_all", "homework_three"]));
    // старое задание не сдано — «все» нет, но последние три — да
    const mixed = [...hw(4), { dueDate: day(-60), status: "NOT_DONE" as HomeworkMark }];
    const got = evaluateAchievements(ach({ homework: mixed }));
    expect(got).toContain("homework_three");
    expect(got).not.toContain("homework_all");
  });
  it("просроченное задание без отметки = не сдано; будущее без отметки не считается", () => {
    expect(evaluateAchievements(ach({ homework: [...hw(3), { dueDate: day(-1), status: null }] }))).not.toContain("homework_three");
    expect(evaluateAchievements(ach({ homework: [...hw(3), { dueDate: day(3), status: null }] }))).toContain("homework_three");
  });
  it("«На пьедестале» (место ≤ 3) и «Растущая звезда» (+5 за неделю и больше)", () => {
    expect(evaluateAchievements(ach({ bestPlace: 3 }))).toContain("podium");
    expect(evaluateAchievements(ach({ bestPlace: 4 }))).not.toContain("podium");
    expect(evaluateAchievements(ach({ weeklyDelta: 5 }))).toContain("rising_star");
    expect(evaluateAchievements(ach({ weeklyDelta: 4.9 }))).not.toContain("rising_star");
    expect(evaluateAchievements(ach())).toEqual([]);
  });
});

describe("рейтинг учителя: посещаемость и доля ДЗ его групп", () => {
  it("считается по всем отметкам сразу, а не средним из средних", () => {
    const r = calculateTeacherAggregates([
      { grades: [], attendance: ["PRESENT"], homework: ["DONE"] },
      { grades: [], attendance: ["ABSENT", "ABSENT", "PRESENT"], homework: ["NOT_DONE", "PARTIAL", "DONE", "DONE"] },
    ]);
    expect(r.attendancePercent).toBe(50); // 2 из 4
    expect(r.homeworkPercent).toBe(70); // (3 + 0.5) / 5
  });
  it("уважительные пропуски исключаются, опоздание = 0.5", () => {
    const r = calculateTeacherAggregates([{ grades: [], attendance: ["LATE", "EXCUSED", "PRESENT"], homework: [] }]);
    expect(r.attendancePercent).toBe(75);
    expect(r.homeworkPercent).toBeNull();
  });
  it("нет учеников/данных → null", () => {
    expect(calculateTeacherAggregates([])).toEqual({ attendancePercent: null, homeworkPercent: null });
  });
});

import { attendanceCounts, gradeCounts, weeklyAttendanceSeries } from "@/lib/trends";

describe("графики: посещаемость по неделям, гистограмма оценок, кольцо посещаемости", () => {
  it("процент по неделям: опоздание 0.5, «уваж.» не в счёт, пустая неделя — null", () => {
    const marks: { date: Date; status: AttendanceMark }[] = [
      { date: day(-2), status: "PRESENT" },
      { date: day(-3), status: "ABSENT" },
      { date: day(-4), status: "EXCUSED" },
      { date: day(-9), status: "LATE" },
      { date: day(-10), status: "PRESENT" },
    ];
    const s = weeklyAttendanceSeries(marks, TODAY, 3);
    expect(s).toHaveLength(3);
    expect(s[2].total).toBe(50); // сегодня: 1 из 2 (уваж. не считается)
    expect(s[1].total).toBe(75); // неделей раньше: (0.5 + 1) / 2
    expect(s[0].total).toBeNull();
  });
  it("граница недели: отметка ровно 7 дней назад относится к прошлой неделе", () => {
    const s = weeklyAttendanceSeries([{ date: day(-7), status: "PRESENT" }], TODAY, 2);
    expect(s[1].total).toBeNull();
    expect(s[0].total).toBe(100);
  });
  it("gradeCounts и attendanceCounts", () => {
    expect(gradeCounts([5, 5, 4, 3, 3, 3, 2, 1, 7, 0, 4.5])).toEqual({ 1: 1, 2: 1, 3: 3, 4: 1, 5: 2 });
    expect(attendanceCounts(["PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"])).toEqual({ PRESENT: 2, LATE: 1, ABSENT: 1, EXCUSED: 1 });
  });
});
