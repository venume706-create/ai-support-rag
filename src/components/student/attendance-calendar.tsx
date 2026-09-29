import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import { HintTip } from "@/components/common/hint-tip";
import { monthGrid, monthKey, shiftMonth } from "@/lib/calendar";
import { toDateOnly, today } from "@/lib/dates";
import { ru } from "@/lib/i18n/ru";
import { withParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const CELL: Record<AttendanceStatus, string> = {
  PRESENT: "bg-ink-green/20 text-ink-green ring-ink-green/50",
  ABSENT: "bg-ink-red/20 text-ink-red ring-ink-red/50",
  LATE: "bg-ink-amber/25 text-ink-amber ring-ink-amber/50",
  EXCUSED: "bg-muted text-muted-foreground ring-border",
};
const LABEL: Record<AttendanceStatus, string> = {
  PRESENT: ru.calendar.present,
  ABSENT: ru.calendar.absent,
  LATE: ru.calendar.late,
  EXCUSED: ru.calendar.excused,
};
const MONTH_FORMAT = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Календарь месяца: день окрашен по отметке. Если в день несколько уроков — берётся худшая отметка
 * (пропуск > опоздание > уважительная > был).
 */
export function AttendanceCalendar({
  month,
  marks,
  pathname,
  params,
}: {
  month: Date;
  /** Отметки за месяц: дата (YYYY-MM-DD) → статусы за день */
  marks: Map<string, AttendanceStatus[]>;
  pathname: string;
  params: Record<string, string | undefined>;
}) {
  const weeks = monthGrid(month);
  const now = today();
  const hrefFor = (m: Date) => withParams(pathname, params, { month: monthKey(m) === monthKey(now) ? undefined : monthKey(m), page: undefined });
  const worst = (list: AttendanceStatus[]): AttendanceStatus => (["ABSENT", "LATE", "EXCUSED", "PRESENT"] as const).find((s) => list.includes(s)) ?? "PRESENT";
  const monthName = MONTH_FORMAT.format(month);

  return (
    <div data-testid="attendance-calendar" data-month={monthKey(month)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={hrefFor(shiftMonth(month, -1))} aria-label={ru.calendar.prev} className="key key-paper inline-flex size-11 shrink-0 items-center justify-center rounded-md">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="flex items-center gap-1 font-serif text-lg font-bold capitalize">
          {monthName}
          <HintTip title={ru.calendar.title}>{ru.calendar.hint}</HintTip>
        </p>
        <Link href={hrefFor(shiftMonth(month, 1))} aria-label={ru.calendar.next} className="key key-paper inline-flex size-11 shrink-0 items-center justify-center rounded-md">
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase sm:gap-1.5">
        {ru.common.weekdaysShort.map((d) => (
          <span key={d}>{d}</span>
        ))}
        {weeks.flat().map((day, i) => {
          if (!day) return <span key={`e${i}`} aria-hidden />;
          const key = toDateOnly(day);
          const list = marks.get(key);
          const status = list ? worst(list) : null;
          return (
            <span
              key={key}
              data-day={key}
              data-status={status ?? undefined}
              title={status ? LABEL[status] : undefined}
              aria-label={status ? ru.calendar.dayLabel(`${day.getUTCDate()}`, LABEL[status]) : undefined}
              className={cn(
                "flex aspect-square min-h-9 items-center justify-center rounded-md text-sm font-bold normal-case tabular-nums",
                status ? `ring-1 ${CELL[status]}` : "text-muted-foreground/70",
                key === toDateOnly(now) && "outline-2 outline-offset-1 outline-ink-blue",
              )}
            >
              {day.getUTCDate()}
            </span>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={ru.calendar.title}>
        {(Object.keys(CELL) as AttendanceStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("size-4 rounded ring-1", CELL[s])} aria-hidden /> {LABEL[s]}
          </li>
        ))}
      </ul>
      {marks.size === 0 && <p className="mt-3 text-sm text-muted-foreground">{ru.calendar.noLessons}</p>}
    </div>
  );
}
