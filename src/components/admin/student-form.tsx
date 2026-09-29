"use client";

import { useActionState } from "react";
import { createStudent } from "@/app/actions/admin";
import { FormError, FormField, SubmitButton, fieldError, submitWith, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";
import { useDialogClose } from "./dialog-form";

/** Создание аккаунта ученика: имя, фамилия, логин, временный пароль, группы. Ник ученик выберет сам при первом входе. */
export function StudentForm({ groups = [] }: { groups?: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createStudent, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, closeDialog);
  const err = (name: string) => fieldError(state, name);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4" noValidate data-testid="student-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.firstName} htmlFor="s-firstName" error={err("firstName")}>
          <Input id="s-firstName" name="firstName" autoComplete="off" required aria-invalid={Boolean(err("firstName"))} />
        </FormField>
        <FormField label={ru.common.lastName} htmlFor="s-lastName" error={err("lastName")}>
          <Input id="s-lastName" name="lastName" autoComplete="off" required aria-invalid={Boolean(err("lastName"))} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.login} htmlFor="s-login" error={err("login")} hint={ru.admin.loginHint}>
          <Input id="s-login" name="login" autoCapitalize="none" autoComplete="off" required aria-invalid={Boolean(err("login"))} />
        </FormField>
        <FormField label={ru.common.tempPassword} htmlFor="s-password" error={err("password")} hint={ru.common.tempPasswordHint}>
          <Input id="s-password" name="password" type="text" autoComplete="off" autoCapitalize="none" required aria-invalid={Boolean(err("password"))} />
        </FormField>
      </div>
      <FormField label={ru.common.parentPhone} htmlFor="s-parentPhone" error={err("parentPhone")}>
        <Input id="s-parentPhone" name="parentPhone" type="tel" inputMode="tel" aria-invalid={Boolean(err("parentPhone"))} />
      </FormField>
      {groups.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-bold">{ru.common.groups}</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <label key={g.id} className="inset-field flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm has-checked:ring-2 has-checked:ring-brass">
                <input type="checkbox" name="groupIds" value={g.id} className="size-5 accent-[#b8893a]" />
                {g.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <FormError state={state} />
      <SubmitButton pending={pending} className="w-full sm:w-auto sm:justify-self-end">
        {ru.common.create}
      </SubmitButton>
    </form>
  );
}
