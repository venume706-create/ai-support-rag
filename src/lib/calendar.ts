import { addDays, isoDayOfWeek, startOfMonth, startOfNextMonth, toDateOnly } from "@/lib/dates";

/** «2026-09» → полночь UTC первого числа; всё некорректное → null. */
export function parseMonth(value: string | undefined): Date | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : null;
}

export function monthKey(date: Date): string {
  return toDateOnly(date).slice(0, 7);
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

/** Недели месяца (пн–вс); дни чужих месяцев — null. */
export function monthGrid(monthStart: Date): Array<Array<Date | null>> {
  const first = startOfMonth(monthStart);
  const end = startOfNextMonth(first);
  const weeks: Array<Array<Date | null>> = [];
  let cursor = addDays(first, 1 - isoDayOfWeek(first));
  while (cursor < end) {
    const week: Array<Date | null> = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(cursor, i);
      week.push(day >= first && day < end ? day : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}
