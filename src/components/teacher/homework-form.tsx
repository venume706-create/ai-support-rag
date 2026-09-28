"use client";

import { useActionState } from "react";
import { saveHomework } from "@/app/actions/teacher";
import { useDialogClose } from "@/components/admin/dialog-form";
import { FormError, FormField, SubmitButton, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ru } from "@/lib/i18n/ru";

export function HomeworkForm({
  groupId,
  initial,
  defaultDue,
}: {
  groupId: string;
  initial?: { id: string; title: string; description: string; dueDate: string };
  defaultDue: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveHomework, null);
  const close = useDialogClose();
  useActionFeedback(state, close);
  const err = (name: string) => fieldError(state, name);
  const prefix = initial ? `hw-${initial.id}` : "hw-new";
  return (
    <form action={action} className="grid gap-4" noValidate data-testid="homework-form">
      <input type="hidden" name="groupId" value={groupId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormField label={ru.teacher.homeworkTitleField} htmlFor={`${prefix}-title`} error={err("title")}>
        <Input id={`${prefix}-title`} name="title" defaultValue={initial?.title} required aria-invalid={Boolean(err("title"))} />
      </FormField>
      <FormField label={ru.teacher.homeworkDescription} htmlFor={`${prefix}-description`} error={err("description")}>
        <Textarea id={`${prefix}-description`} name="description" defaultValue={initial?.description} rows={4} />
      </FormField>
      <FormField label={ru.teacher.dueDate} htmlFor={`${prefix}-due`} error={err("dueDate")}>
        <Input id={`${prefix}-due`} name="dueDate" type="date" defaultValue={initial?.dueDate ?? defaultDue} required aria-invalid={Boolean(err("dueDate"))} />
      </FormField>
      <FormError state={state} />
      <SubmitButton className="w-full sm:w-auto sm:justify-self-end">{initial ? ru.common.save : ru.common.create}</SubmitButton>
    </form>
  );
}
