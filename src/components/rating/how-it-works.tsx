"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";
import { RANKS } from "@/lib/ranks";
import { RankBadge } from "./medal";

/** Кнопка «Как считается рейтинг?» с простым объяснением и примерами. */
export function HowItWorks() {
  const h = ru.insights.how;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="how-it-works">
          <CircleHelp /> {h.button}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={ru.common.close} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{h.title}</DialogTitle>
          <DialogDescription>{h.intro}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          {[
            [h.grades, h.gradesText],
            [h.attendance, h.attendanceText],
            [h.homework, h.homeworkText],
          ].map(([title, text]) => (
            <section key={title} className="rounded-md bg-black/[0.04] p-3 dark:bg-white/[0.05]">
              <h3 className="font-serif text-base font-bold">{title}</h3>
              <p className="mt-1">{text}</p>
            </section>
          ))}
          <p className="font-bold">{h.noData}</p>
          <div>
            <h3 className="mb-2 font-serif text-base font-bold">{h.ranksTitle}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RANKS.map((r) => (
                <li key={r.code} className="flex items-center gap-2">
                  <RankBadge rank={r.code} size={40} />
                  <span className="leading-tight">
                    <span className="block font-bold">{ru.ranks[r.code]}</span>
                    <span className="text-xs text-muted-foreground">{h.ranksFrom(r.min)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">{h.colors}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{h.close}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
