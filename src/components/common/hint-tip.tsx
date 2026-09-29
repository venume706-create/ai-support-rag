"use client";

import { CircleHelp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

/** Кнопка «?» — открывает окошко с простым объяснением. */
export function HintTip({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${ru.hint.open}: ${title}`}
          data-testid="hint-tip"
          className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10", className)}
        >
          <CircleHelp className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent closeLabel={ru.common.close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
