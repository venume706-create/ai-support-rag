"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { createSubject, deleteSubject, renameSubject } from "@/app/actions/admin";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { FormError, SubmitButton, submitWith, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";

function RenameRow({ subject }: { subject: { id: string; name: string; groups: number } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renameSubject, null);
  useActionFeedback(state);
  return (
    <li className="grid gap-2 border-b border-dotted border-border py-3 last:border-0">
      <form onSubmit={submitWith(action)} className="grid gap-2">
        <input type="hidden" name="id" value={subject.id} />
        <Input name="name" defaultValue={subject.name} aria-label={ru.common.subject} />
        <div className="flex items-center gap-2">
          <SubmitButton pending={pending} variant="outline" className="flex-1">{ru.common.save}</SubmitButton>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {ru.admin.groupsCount}: {subject.groups}
          </span>
        </div>
      </form>
      <ConfirmAction
        label={ru.common.delete}
        size="sm"
        icon={<Trash2 />}
        title={`${ru.common.delete}: ${subject.name}`}
        description={ru.common.confirmDelete}
        confirmLabel={ru.common.delete}
        action={() => deleteSubject(subject.id)}
      />
      {fieldError(state, "name") && <p className="w-full text-sm font-bold text-ink-red">{fieldError(state, "name")}</p>}
    </li>
  );
}

export function SubjectsManager({ subjects }: { subjects: { id: string; name: string; groups: number }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSubject, null);
  const form = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => form.current?.reset());
  return (
    <div className="grid gap-3">
      <ul>
        {subjects.map((s) => (
          <RenameRow key={s.id} subject={s} />
        ))}
      </ul>
      <form ref={form} onSubmit={submitWith(action)} className="flex gap-2">
        <Input name="name" placeholder={ru.admin.subjectNew} aria-label={ru.admin.subjectNew} className="flex-1" />
        <SubmitButton pending={pending}>{ru.common.add}</SubmitButton>
      </form>
      {fieldError(state, "name") ? <p className="text-sm font-bold text-ink-red">{fieldError(state, "name")}</p> : <FormError state={state} />}
    </div>
  );
}
