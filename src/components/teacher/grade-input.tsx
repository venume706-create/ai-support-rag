"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { addGrade, deleteGrade } from "@/app/actions/teacher";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

interface LessonGrade {
  id: string;
  value: number;
  comment: string;
}

const INK: Record<number, string> = { 5: "text-ink-red", 4: "text-ink-red", 3: "text-ink-blue", 2: "text-ink-blue", 1: "text-ink-blue" };

/** Быстрый ввод оценок за урок: клавиши 1–5, оценки выводятся «от руки». */
export function GradeInput({
  lessonId,
  studentId,
  studentName,
  initial,
  disabled = false,
}: {
  lessonId: string;
  studentId: string;
  studentName: string;
  initial: LessonGrade[];
  disabled?: boolean;
}) {
  const [grades, setGrades] = useState<LessonGrade[]>(initial);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(value: number) {
    start(async () => {
      const result = await addGrade({ lessonId, studentId, value, comment });
      if (result.ok && result.data) {
        setGrades((g) => [...g, { id: result.data!.id, value, comment }]);
        setComment("");
        setShowComment(false);
        toast.success(result.message);
      } else if (!result.ok) toast.error(result.error);
    });
  }

  function remove(id: string) {
    start(async () => {
      const result = await deleteGrade(id);
      if (result.ok) {
        setGrades((g) => g.filter((x) => x.id !== id));
        setConfirmId(null);
        toast.success(result.message);
      } else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-1.5" data-testid={`grades-${studentId}`}>
      <div className="flex min-h-9 flex-wrap items-center gap-1">
        {grades.map((g) => (
          <span key={g.id} className="group relative inline-flex items-center" title={g.comment || undefined}>
            <span className={cn("handwritten px-1 text-3xl", INK[g.value])} data-grade={g.value}>
              {g.value}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => setConfirmId(g.id)}
                disabled={pending}
                aria-label={ru.teacher.removeGrade(g.value)}
                className="-ml-1 flex size-11 items-center justify-center rounded-full text-muted-foreground opacity-70 hover:bg-black/10 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {grades.length === 0 && <span className="text-muted-foreground">{ru.teacher.noGrades}</span>}
      </div>
      <Dialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent closeLabel={ru.common.close}>
          <DialogHeader>
            <DialogTitle>{ru.teacher.deleteGradeTitle}</DialogTitle>
            <DialogDescription>{ru.teacher.deleteGradeText(studentName, grades.find((g) => g.id === confirmId)?.value ?? 0)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{ru.common.cancel}</Button>
            </DialogClose>
            <Button variant="destructive" disabled={pending} onClick={() => confirmId && remove(confirmId)} data-testid="confirm-action">
              {ru.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1">
          {[5, 4, 3, 2, 1].map((v) => (
            <button
              key={v}
              type="button"
              disabled={pending}
              onClick={() => add(v)}
              aria-label={ru.teacher.gradeFor(studentName, v)}
              data-grade-key={v}
              className="key key-paper handwritten size-11 rounded-md text-2xl disabled:opacity-50"
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowComment((s) => !s)}
            className="ml-1 inline-flex min-h-11 items-center px-2 text-sm font-bold text-muted-foreground underline decoration-dotted"
            aria-expanded={showComment}
          >
            {ru.common.comment}
          </button>
          {showComment && (
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={200}
              placeholder={ru.teacher.commentPlaceholder}
              aria-label={ru.common.comment}
              className="inset-field h-11 w-full rounded-md px-2 text-base sm:w-56"
            />
          )}
        </div>
      )}
    </div>
  );
}
