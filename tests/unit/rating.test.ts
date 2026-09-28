import { describe, expect, it } from "vitest";
import {
  attendanceRatio,
  calculateStudentRating,
  calculateTeacherRating,
  gradesRatio,
  homeworkRatio,
  ratingLevel,
  round1,
} from "@/lib/rating";

describe("рейтинг ученика: полные данные", () => {
  it("идеальный ученик получает 100", () => {
    const r = calculateStudentRating({ grades: [5, 5, 5], attendance: ["PRESENT", "PRESENT"], homework: ["DONE", "DONE"] });
    expect(r.total).toBe(100);
    expect(r.grades.points).toBe(50);
    expect(r.attendance.points).toBe(25);
    expect(r.homework.points).toBe(25);
  });

  it("считает по формулам: средняя 4 → 40, посещаемость 3.5/4 → 21.9, ДЗ 2.5/4 → 15.6", () => {
    const r = calculateStudentRating({
      grades: [5, 3, 4, 4],
      attendance: ["PRESENT", "PRESENT", "PRESENT", "LATE"],
      homework: ["DONE", "DONE", "PARTIAL", "NOT_DONE"],
    });
    expect(r.grades.points).toBe(40);
    expect(r.grades.average).toBe(4);
    expect(r.attendance.points).toBe(21.9); // 3.5 / 4 × 25 = 21.875
    expect(r.homework.points).toBe(15.6); // 2.5 / 4 × 25 = 15.625
    expect(r.total).toBe(77.5); // 40 + 21.875 + 15.625
  });

  it("итог округляется до 0.1 от точной суммы, а не от округлённых частей", () => {
    const r = calculateStudentRating({ grades: [4, 5, 5], attendance: ["PRESENT", "PRESENT", "ABSENT"], homework: ["DONE", "PARTIAL", "DONE"] });
    // 46.666… + 16.666… + 20.833… = 84.1666…
    expect(r.total).toBe(84.2);
  });

  it("худший случай: все двойки/единицы, прогулы, ничего не сделано", () => {
    const r = calculateStudentRating({ grades: [1, 1], attendance: ["ABSENT", "ABSENT"], homework: ["NOT_DONE"] });
    expect(r.grades.points).toBe(10);
    expect(r.attendance.points).toBe(0);
    expect(r.homework.points).toBe(0);
    expect(r.total).toBe(10);
  });
});

describe("посещаемость", () => {
  it("опоздание считается как 0.5 посещения", () => {
    expect(attendanceRatio(["LATE", "LATE"]).ratio).toBe(0.5);
  });

  it("уважительные пропуски исключаются из знаменателя", () => {
    const a = attendanceRatio(["PRESENT", "EXCUSED", "EXCUSED", "ABSENT"]);
    expect(a.counted).toBe(2);
    expect(a.ratio).toBe(0.5);
  });

  it("только уважительные пропуски → нет данных (не ноль и не деление на ноль)", () => {
    expect(attendanceRatio(["EXCUSED", "EXCUSED"])).toEqual({ ratio: null, counted: 0 });
  });
});

describe("домашние задания", () => {
  it("частичное выполнение = 0.5", () => {
    expect(homeworkRatio(["PARTIAL", "PARTIAL", "DONE", "NOT_DONE"]).ratio).toBe(0.5);
  });

  it("нет заданий → нет данных", () => {
    expect(homeworkRatio([])).toEqual({ ratio: null, count: 0 });
  });
});

describe("оценки", () => {
  it("игнорирует значения вне диапазона 1–5", () => {
    expect(gradesRatio([5, 0, 6, Number.NaN, 3]).average).toBe(4);
  });

  it("нет оценок → нет данных", () => {
    expect(gradesRatio([])).toEqual({ ratio: null, average: null });
  });
});

describe("неполные данные: пропорциональный пересчёт", () => {
  it("совсем нет данных → итог null, все части «нет данных»", () => {
    const r = calculateStudentRating({ grades: [], attendance: [], homework: [] });
    expect(r.total).toBeNull();
    expect(r.grades.points).toBeNull();
    expect(r.attendance.points).toBeNull();
    expect(r.homework.points).toBeNull();
  });

  it("есть только оценки → итог = доля успеваемости × 100", () => {
    const r = calculateStudentRating({ grades: [4], attendance: [], homework: [] });
    expect(r.grades.points).toBe(40);
    expect(r.total).toBe(80); // 40 / 50 × 100
  });

  it("нет ДЗ → итог по оценкам и посещаемости из 75 возможных, масштабированный к 100", () => {
    const r = calculateStudentRating({ grades: [5], attendance: ["PRESENT", "ABSENT"], homework: [] });
    // (50 + 12.5) / 75 × 100 = 83.33…
    expect(r.homework.points).toBeNull();
    expect(r.total).toBe(83.3);
  });

  it("отсутствие части не превращается в ноль", () => {
    const withMissing = calculateStudentRating({ grades: [5], attendance: ["PRESENT"], homework: [] });
    const withZero = calculateStudentRating({ grades: [5], attendance: ["PRESENT"], homework: ["NOT_DONE"] });
    expect(withMissing.total).toBe(100);
    expect(withZero.total).toBe(75);
  });
});

describe("рейтинг учителя", () => {
  it("среднее рейтингов учеников, округлённое до 0.1", () => {
    expect(calculateTeacherRating([80, 90, 71])).toEqual({ rating: 80.3, studentsCounted: 3 });
  });

  it("ученики без данных не учитываются", () => {
    expect(calculateTeacherRating([null, 60, null, 90])).toEqual({ rating: 75, studentsCounted: 2 });
  });

  it("нет учеников с данными → null", () => {
    expect(calculateTeacherRating([])).toEqual({ rating: null, studentsCounted: 0 });
    expect(calculateTeacherRating([null, null])).toEqual({ rating: null, studentsCounted: 0 });
  });
});

describe("цветовые зоны и округление", () => {
  it("границы зон: 80 — зелёная, 79.9 и 50 — жёлтая, 49.9 — красная", () => {
    expect(ratingLevel(100)).toBe("high");
    expect(ratingLevel(80)).toBe("high");
    expect(ratingLevel(79.9)).toBe("medium");
    expect(ratingLevel(50)).toBe("medium");
    expect(ratingLevel(49.9)).toBe("low");
    expect(ratingLevel(0)).toBe("low");
    expect(ratingLevel(null)).toBe("none");
  });

  it("round1 корректно округляет половины", () => {
    expect(round1(21.875)).toBe(21.9);
    expect(round1(15.625)).toBe(15.6);
    expect(round1(0.05)).toBe(0.1);
  });
});
