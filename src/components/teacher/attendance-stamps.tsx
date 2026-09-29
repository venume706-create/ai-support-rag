"use client";

import { useState, useTransition } from "react";
import type { AttendanceStatus } from "@prisma/client";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveAttendance } from "@/app/actions/teacher";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

const STATUSES: { value: AttendanceStatus; color: string }[] = [
  { value: "PRESENT", color: "stamp-green" },
  { value: "LATE", color: "stamp-amber" },
  { value: "ABSENT", color: "stamp-red" },
  { value: "EXCUSED", color: "stamp-blue" },
];

/** Отметка посещаемости «чернильным штампом»: один клик — сразу сохраняется. */
export function AttendanceStamps({
  lessonId,
  studentId,
  studentName,
  initial,
  disabled = false,
}: {
  lessonId: string;
  studentId: string;
  studentName: string;
  initial: AttendanceStatus | null;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<AttendanceStatus | null>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function mark(next: AttendanceStatus) {
    if (disabled || next === status) return;
    const previous = status;
    setStatus(next);
    setSaved(false);
    start(async () => {
      const result = await saveAttendance({ lessonId, studentId, status: next });
      if (result.ok) setSaved(true);
      else {
        setStatus(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={studentName} data-testid={`attendance-${studentId}`}>
      {STATUSES.map((s) => (
        <button
          key={s.value}
          type="button"
          disabled={disabled}
          onClick={() => mark(s.value)}
          aria-pressed={status === s.value}
          aria-label={ru.teacher.markStatus(studentName, ru.attendanceStatusFull[s.value])}
          data-status={s.value}
          className={cn("stamp stamp-button min-h-11 min-w-[4.6rem] cursor-pointer disabled:cursor-not-allowed", s.color)}
        >
          {ru.attendanceStatus[s.value]}
        </button>
      ))}
      <span className="inline-flex size-5 items-center justify-center text-ink-green" aria-live="polite">
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : saved ? <Check className="size-4" aria-label={ru.common.saved} /> : null}
      </span>
    </div>
  );
}
