"use client";

import { useActionState } from "react";
import { createTeacher } from "@/app/actions/admin";
import { FormError, FormField, SubmitButton, fieldError, submitWith, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";
import { useDialogClose } from "./dialog-form";

interface Subject {
  id: string;
  name: string;
}

/** Создание аккаунта учителя: имя, фамилия, логин, временный пароль, предметы. Ник человек выберет сам при первом входе. */
export function TeacherForm({ subjects }: { subjects: Subject[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTeacher, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, closeDialog);
  const err = (name: string) => fieldError(state, name);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4" noValidate data-testid="teacher-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.firstName} htmlFor="t-firstName" error={err("firstName")}>
          <Input id="t-firstName" name="firstName" autoComplete="off" required aria-invalid={Boolean(err("firstName"))} />
        </FormField>
        <FormField label={ru.common.lastName} htmlFor="t-lastName" error={err("lastName")}>
          <Input id="t-lastName" name="lastName" autoComplete="off" required aria-invalid={Boolean(err("lastName"))} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.login} htmlFor="t-login" error={err("login")} hint={ru.admin.loginHint}>
          <Input id="t-login" name="login" autoCapitalize="none" autoComplete="off" required aria-invalid={Boolean(err("login"))} />
        </FormField>
        <FormField label={ru.common.tempPassword} htmlFor="t-password" error={err("password")} hint={ru.common.tempPasswordHint}>
          <Input id="t-password" name="password" type="text" autoComplete="off" autoCapitalize="none" required aria-invalid={Boolean(err("password"))} />
        </FormField>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-bold">{ru.common.subjects}</legend>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <label key={s.id} className="inset-field flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm has-checked:ring-2 has-checked:ring-brass">
              <input type="checkbox" name="subjectIds" value={s.id} className="size-5 accent-[#b8893a]" />
              {s.name}
            </label>
          ))}
        </div>
        {err("subjectIds") && <p className="text-sm font-bold text-ink-red" role="alert">{err("subjectIds")}</p>}
      </fieldset>
      <FormError state={state} />
      <SubmitButton pending={pending} className="w-full sm:w-auto sm:justify-self-end">
        {ru.common.create}
      </SubmitButton>
    </form>
  );
}
