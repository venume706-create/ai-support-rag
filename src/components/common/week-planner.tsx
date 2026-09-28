import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, formatDayMonth, toDateOnly, today } from "@/lib/dates";
import { ru } from "@/lib/i18n/ru";
import type { PlannerLesson } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** Недельное расписание в виде ежедневника на кольцах. */
export function WeekPlanner({
  start,
  lessons,
  pathname,
  params = {},
  prev,
  next,
  lessonHref,
  showTeacher = true,
}: {
  start: Date;
  lessons: PlannerLesson[];
  pathname: string;
  params?: Record<string, string>;
  prev: string;
  next: string;
  lessonHref?: (l: PlannerLesson) => string;
  showTeacher?: boolean;
}) {
  const todayStr = toDateOnly(today());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const qs = (week?: string) => {
    const p = new URLSearchParams(params);
    if (week) p.set("week", week);
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  return (
    <div data-testid="week-planner">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon" aria-label={ru.schedule.prevWeek}>
            <Link href={qs(prev)} scroll={false}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={qs()} scroll={false}>
              {ru.schedule.thisWeek}
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label={ru.schedule.nextWeek}>
            <Link href={qs(next)} scroll={false}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <p className="font-serif text-lg font-bold text-on-wood">
          {ru.schedule.week(formatDayMonth(days[0]), formatDayMonth(days[6]))}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((day, i) => {
          const date = toDateOnly(day);
          const items = lessons.filter((l) => l.date === date);
          const isToday = date === todayStr;
          return (
            <section key={date} className={cn("paper planner-page rounded-md py-3 pr-3", isToday && "ring-2 ring-brass")} aria-label={ru.common.weekdays[i]}>
              <span className="planner-rings" aria-hidden />
              <header className="mb-2 flex items-baseline justify-between border-b-2 border-double border-border pb-1">
                <h3 className="font-serif text-base font-bold">{ru.common.weekdays[i]}</h3>
                <span className={cn("handwritten text-xl", isToday ? "text-ink-red" : "text-ink-blue")}>{formatDayMonth(day)}</span>
              </header>
              {items.length === 0 ? (
                <p className="handwritten py-2 text-lg text-muted-foreground">{ru.schedule.noLessonsDay}</p>
              ) : (
                <ul className="grid gap-2">
                  {items.map((l) => {
                    const body = (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
                            <Clock className="size-3.5" /> {l.startTime}–{l.endTime}
                          </span>
                          {l.room && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DoorOpen className="size-3.5" /> {l.room}
                            </span>
                          )}
                        </div>
                        <p className="font-serif font-bold">{l.groupName}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.subject}
                          {showTeacher && ` · ${l.teacher ?? ru.common.notAssigned}`}
                        </p>
                        {l.topic && <p className="handwritten text-lg text-ink-blue">{l.topic}</p>}
                      </>
                    );
                    return (
                      <li key={l.id} className="border-b border-dotted border-border pb-2 last:border-0">
                        {lessonHref ? (
                          <Link href={lessonHref(l)} className="block rounded-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                            {body}
                          </Link>
                        ) : (
                          body
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
