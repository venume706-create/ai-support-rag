"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveGroup } from "@/app/actions/admin";
import { FormError, FormField, SubmitButton, submitWith, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ru } from "@/lib/i18n/ru";
import { useDialogClose } from "./dialog-form";

interface Option {
  id: string;
  name: string;
}

export interface GroupFormValues {
  id: string;
  name: string;
  subjectId: string;
  teacherId: string;
  level: string;
}

export function GroupForm({
  subjects,
  teachers,
  initial,
  onDone,
  openAfterCreate = false,
}: {
  subjects: Option[];
  teachers: (Option & { subjectIds: string[] })[];
  initial?: GroupFormValues;
  onDone?: () => void;
  openAfterCreate?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(saveGroup, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, () => {
    (onDone ?? closeDialog)?.();
    const id = state && state.ok ? (state.data as { id?: string } | undefined)?.id : undefined;
    if (openAfterCreate && !initial && id) router.push(`/admin/groups/${id}`);
  });
  const err = (name: string) => fieldError(state, name);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4" noValidate data-testid="group-form">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormField label={ru.common.group} htmlFor="g-name" error={err("name")}>
        <Input id="g-name" name="name" defaultValue={initial?.name} required aria-invalid={Boolean(err("name"))} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.subject} htmlFor="g-subject" error={err("subjectId")}>
          <NativeSelect id="g-subject" name="subjectId" defaultValue={initial?.subjectId ?? ""} required aria-invalid={Boolean(err("subjectId"))}>
            <option value="" disabled>
              {ru.admin.selectSubject}
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label={ru.common.level} htmlFor="g-level" error={err("level")}>
          <Input id="g-level" name="level" defaultValue={initial?.level} aria-invalid={Boolean(err("level"))} />
        </FormField>
      </div>
      <FormField label={ru.admin.assignTeacher} htmlFor="g-teacher" error={err("teacherId")}>
        <NativeSelect id="g-teacher" name="teacherId" defaultValue={initial?.teacherId ?? ""} aria-invalid={Boolean(err("teacherId"))}>
          <option value="">{ru.common.notAssigned}</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.subjectIds.map((id) => subjects.find((s) => s.id === id)?.name).filter(Boolean).join(", ")})
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormError state={state} />
      <SubmitButton pending={pending} className="w-full sm:w-auto sm:justify-self-end">{initial ? ru.common.save : ru.common.create}</SubmitButton>
    </form>
  );
}
