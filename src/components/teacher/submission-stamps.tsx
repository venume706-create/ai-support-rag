"use client";

import { useState, useTransition } from "react";
import type { HomeworkStatus } from "@prisma/client";
import { Check, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { saveSubmission } from "@/app/actions/teacher";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

const OPTIONS: { value: HomeworkStatus; color: string; Icon: typeof Check }[] = [
  { value: "DONE", color: "stamp-green", Icon: Check },
  { value: "PARTIAL", color: "stamp-amber", Icon: Minus },
  { value: "NOT_DONE", color: "stamp-red", Icon: X },
];

/** Отметка выполнения ДЗ одним нажатием, с автосохранением. */
export function SubmissionStamps({
  homeworkId,
  studentId,
  studentName,
  initial,
}: {
  homeworkId: string;
  studentId: string;
  studentName: string;
  initial: HomeworkStatus | null;
}) {
  const [status, setStatus] = useState<HomeworkStatus | null>(initial);
  const [pending, start] = useTransition();
  function mark(next: HomeworkStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    start(async () => {
      const r = await saveSubmission({ homeworkId, studentId, status: next });
      if (!r.ok) {
        setStatus(prev);
        toast.error(r.error);
      }
    });
  }
  return (
    <div className="flex items-center justify-between gap-2 py-1" data-testid={`submission-${homeworkId}-${studentId}`}>
      <span className="min-w-0 truncate text-sm">{studentName}</span>
      <div className="flex shrink-0 gap-1" role="group" aria-label={studentName} aria-busy={pending}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => mark(o.value)}
            aria-pressed={status === o.value}
            aria-label={`${studentName}: ${ru.homeworkStatus[o.value]}`}
            title={ru.homeworkStatus[o.value]}
            className={cn("stamp stamp-button min-h-11 min-w-11 cursor-pointer px-1.5 text-base", o.color)}
          >
            <o.Icon className="size-5" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
