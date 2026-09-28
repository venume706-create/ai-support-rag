/**
 * Работа с датами. Календарные даты уроков хранятся как полночь UTC
 * соответствующего дня; «сегодня» определяется в часовом поясе центра
 * (APP_TIMEZONE, по умолчанию Asia/Tashkent).
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Tashkent";

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD → Date (полночь UTC). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date → YYYY-MM-DD по UTC. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Сегодняшняя дата в часовом поясе центра как полночь UTC. */
export function today(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDateOnly(parts);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** День недели 1 (пн) … 7 (вс) для даты-полуночи UTC. */
export function isoDayOfWeek(date: Date): number {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}

/** Понедельник недели, в которую входит дата. */
export function startOfWeek(date: Date): Date {
  return addDays(date, 1 - isoDayOfWeek(date));
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(date);
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
