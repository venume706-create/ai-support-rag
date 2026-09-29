"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addTeacherNote, deleteTeacherNote } from "@/app/actions/teacher";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { HintTip } from "@/components/common/hint-tip";
import { EmptyState } from "@/components/common/status-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ru } from "@/lib/i18n/ru";

export interface NoteRow {
  id: string;
  text: string;
  date: string;
  author?: string;
}

/** Заметки учителя об ученике. Для администратора — только чтение, с указанием автора. */
export function StudentNotes({ studentId, notes, readOnly = false }: { studentId: string; notes: NoteRow[]; readOnly?: boolean }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = ru.notes;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    start(async () => {
      const r = await addTeacherNote({ studentId, text });
      if (r.ok) {
        toast.success(r.message);
        setText("");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <Card data-testid="student-notes">
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          {readOnly ? t.adminTitle : t.title}
          <HintTip title={t.title}>{t.hint}</HintTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!readOnly && (
          <form onSubmit={submit} className="grid gap-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={3} placeholder={t.placeholder} aria-label={t.label} data-testid="note-text" />
            <Button type="submit" disabled={pending || !text.trim()} className="justify-self-start" data-testid="note-add">
              {pending && <Loader2 className="animate-spin" />}
              {t.add}
            </Button>
          </form>
        )}
        {notes.length === 0 ? (
          <EmptyState kind="board" text={readOnly ? t.adminEmpty : t.empty} />
        ) : (
          <ul className="grid gap-3" data-testid="note-list">
            {notes.map((n) => (
              <li key={n.id} className="note paper flex items-start justify-between gap-3 rounded-sm p-3" data-testid="note">
                <div className="min-w-0">
                  <p className="text-sm whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.date}
                    {n.author && ` · ${t.author}: ${n.author}`}
                  </p>
                </div>
                {!readOnly && (
                  <ConfirmAction
                    label={ru.common.delete}
                    title={t.deleteTitle}
                    description={t.deleteText}
                    confirmLabel={ru.common.delete}
                    action={() => deleteTeacherNote(n.id)}
                    size="icon"
                    variant="outline"
                    icon={<Trash2 />}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
