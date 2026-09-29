import Link from "next/link";
import { Clock, DoorOpen } from "lucide-react";
import { GradeBadge, HomeworkStateBadge } from "@/components/common/badges";
import { HintTip } from "@/components/common/hint-tip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeworkState } from "@/lib/homework-state";
import { formatDate } from "@/lib/dates";
import { ru } from "@/lib/i18n/ru";

export interface TodayData {
  lessons: Array<{ id: string; group: string; startTime: string; endTime: string; room?: string; topic: string }>;
  homework: Array<{ id: string; title: string; group: string; state: HomeworkState; daysLeft: number }>;
  grades: Array<{ id: string; value: number; group: string; date: Date; comment: string }>;
}

/** «Моё сегодня»: уроки на сегодня, что сдать в ближайшие дни, новые оценки за неделю. */
export function TodayCard({ data }: { data: TodayData }) {
  const t = ru.today;
  return (
    <Card data-testid="my-today">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1">
          {t.title}
          <HintTip title={t.title}>{t.hint}</HintTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <section aria-labelledby="today-lessons">
          <h3 id="today-lessons" className="mb-2 text-xs font-bold text-muted-foreground uppercase">
            {t.lessons}
          </h3>
          {data.lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="today-no-lessons">{t.noLessons}</p>
          ) : (
            <ul className="grid gap-2" data-testid="today-lessons-list">
              {data.lessons.map((l) => (
                <li key={l.id} className="rounded-md bg-black/[0.04] p-2.5 dark:bg-white/[0.05]">
                  <p className="font-serif font-bold">{l.group}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="size-3.5" /> {l.startTime}–{l.endTime}
                    </span>
                    {l.room && (
                      <span className="flex items-center gap-1">
                        <DoorOpen className="size-3.5" /> {l.room}
                      </span>
                    )}
                  </p>
                  {l.topic && <p className="mt-1 text-sm">{l.topic}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="today-homework">
          <h3 id="today-homework" className="mb-2 text-xs font-bold text-muted-foreground uppercase">
            {t.homework}
          </h3>
          {data.homework.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="today-no-homework">{t.noHomework}</p>
          ) : (
            <ul className="grid gap-2" data-testid="today-homework-list">
              {data.homework.map((h) => (
                <li key={h.id} className="rounded-md bg-black/[0.04] p-2.5 dark:bg-white/[0.05]">
                  <p className="font-bold">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{h.group}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <HomeworkStateBadge state={h.state} />
                    <span className="text-muted-foreground">
                      {h.daysLeft < 0 ? ru.hw.daysAgo(-h.daysLeft) : h.daysLeft > 0 ? ru.hw.daysLeft(h.daysLeft) : ""}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/student/homework">{t.openHomework}</Link>
          </Button>
        </section>
        <section aria-labelledby="today-grades">
          <h3 id="today-grades" className="mb-2 text-xs font-bold text-muted-foreground uppercase">
            {t.grades}
          </h3>
          {data.grades.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="today-no-grades">{t.noGrades}</p>
          ) : (
            <ul className="grid gap-2" data-testid="today-grades-list">
              {data.grades.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 rounded-md bg-black/[0.04] p-2.5 dark:bg-white/[0.05]">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{g.group}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(g.date)}
                      {g.comment && ` · ${g.comment}`}
                    </p>
                  </div>
                  <GradeBadge value={g.value} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
