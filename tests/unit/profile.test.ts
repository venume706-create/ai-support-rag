import { describe, expect, it } from "vitest";
import { checkNicknameFormat, displayNick, fullNameOf, nicknameKey, userSearchKey } from "@/lib/profile";

describe("ник: формат", () => {
  it("принимает буквы, цифры, точку, дефис и подчёркивание", () => {
    for (const ok of ["Лиса", "Fox_99", "a.b-c", "Ева_Ева", "Ёж123"]) expect(checkNicknameFormat(ok)).toBeNull();
  });
  it("границы длины: 3 — можно, 2 — мало, 20 — можно, 21 — много", () => {
    expect(checkNicknameFormat("abc")).toBeNull();
    expect(checkNicknameFormat("ab")).toBe("short");
    expect(checkNicknameFormat("a".repeat(20))).toBeNull();
    expect(checkNicknameFormat("a".repeat(21))).toBe("long");
  });
  it("длину считает по символам, а не по байтам (кириллица)", () => {
    expect(checkNicknameFormat("Я".repeat(20))).toBeNull();
    expect(checkNicknameFormat("Я".repeat(21))).toBe("long");
  });
  it("запрещает пробелы, скобки, теги и эмодзи", () => {
    for (const bad of ["a b c", "<b>abc</b>", "abc'--", "ник😀", "a@b"]) expect(checkNicknameFormat(bad)).toBe("chars");
  });
  it("пробелы по краям обрезаются", () => {
    expect(checkNicknameFormat("  Лиса  ")).toBeNull();
  });
});

describe("ник: уникальность без учёта регистра", () => {
  it("ключ не различает регистр и ё/е", () => {
    expect(nicknameKey("Ёжик")).toBe(nicknameKey("ежик"));
    expect(nicknameKey("LISA")).toBe(nicknameKey("lisa"));
    expect(nicknameKey(" Лиса ")).toBe("лиса");
  });
});

describe("имя и поиск", () => {
  it("fullNameOf склеивает имя и фамилию", () => {
    expect(fullNameOf(" Анна ", " Иванова ")).toBe("Анна Иванова");
    expect(fullNameOf("Анна", "")).toBe("Анна");
  });
  it("displayNick: ник, а пока его нет — логин", () => {
    expect(displayNick({ nickname: "Лиса", login: "student1" })).toBe("Лиса");
    expect(displayNick({ nickname: null, login: "student1" })).toBe("student1");
  });
  it("ключ поиска включает ник, имя, фамилию и логин", () => {
    const key = userSearchKey({ nickname: "Ёжик", firstName: "Анна", lastName: "Иванова", login: "student1" });
    for (const part of ["ежик", "анна", "иванова", "student1"]) expect(key).toContain(part);
  });
});
