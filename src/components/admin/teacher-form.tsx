"use client";

import { useActionState } from "react";
import { createTeacher, updateTeacher } from "@/app/actions/admin";
import { FormError, FormField, SubmitButton, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";
import { useDialogClose } from "./dialog-form";

interface Subject {
  id: string;
  name: string;
}

export interface TeacherFormValues {
  id: string;
  login: string;
  fullName: string;
  phone: string;
  subjectIds: string[];
}

export function TeacherForm({ subjects, initial, onDone }: { subjects: Subject[]; initial?: TeacherFormValues; onDone?: () => void }) {
  const editing = Boolean(initial);
  const [state, action] = useActionState<FormState, FormData>(editing ? updateTeacher : createTeacher, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, onDone ?? closeDialog);
  const err = (name: string) => fieldError(state, name);
  return (
    <form action={action} className="grid gap-4" noValidate data-testid="teacher-form">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormField label={ru.common.fullName} htmlFor="t-fullName" error={err("fullName")}>
        <Input id="t-fullName" name="fullName" defaultValue={initial?.fullName} required aria-invalid={Boolean(err("fullName"))} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.login} htmlFor="t-login" error={err("login")}>
          <Input id="t-login" name="login" defaultValue={initial?.login} autoCapitalize="none" required aria-invalid={Boolean(err("login"))} />
        </FormField>
        <FormField
          label={editing ? ru.common.newPassword : ru.common.password}
          htmlFor="t-password"
          error={err("password")}
          hint={editing ? ru.common.passwordHint : undefined}
        >
          <Input id="t-password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(err("password"))} />
        </FormField>
      </div>
      <FormField label={ru.common.phone} htmlFor="t-phone" error={err("phone")}>
        <Input id="t-phone" name="phone" type="tel" defaultValue={initial?.phone} aria-invalid={Boolean(err("phone"))} />
      </FormField>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-bold">{ru.common.subjects}</legend>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <label key={s.id} className="inset-field flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm has-checked:ring-2 has-checked:ring-brass">
              <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={initial?.subjectIds.includes(s.id)} className="size-4 accent-[#b8893a]" />
              {s.name}
            </label>
          ))}
        </div>
        {err("subjectIds") && <p className="text-sm font-bold text-ink-red" role="alert">{err("subjectIds")}</p>}
      </fieldset>
      <FormError state={state} />
      <SubmitButton className="w-full sm:w-auto sm:justify-self-end">{editing ? ru.common.save : ru.common.create}</SubmitButton>
    </form>
  );
}
