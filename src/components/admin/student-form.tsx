"use client";

import { useActionState } from "react";
import { createStudent, updateStudent } from "@/app/actions/admin";
import { FormError, FormField, SubmitButton, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";
import { useDialogClose } from "./dialog-form";

interface GroupOption {
  id: string;
  name: string;
}

export interface StudentFormValues {
  id: string;
  login: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  birthDate: string;
}

export function StudentForm({ groups = [], initial, onDone }: { groups?: GroupOption[]; initial?: StudentFormValues; onDone?: () => void }) {
  const editing = Boolean(initial);
  const [state, action] = useActionState<FormState, FormData>(editing ? updateStudent : createStudent, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, onDone ?? closeDialog);
  const err = (name: string) => fieldError(state, name);
  return (
    <form action={action} className="grid gap-4" noValidate data-testid="student-form">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormField label={ru.common.fullName} htmlFor="s-fullName" error={err("fullName")}>
        <Input id="s-fullName" name="fullName" defaultValue={initial?.fullName} required aria-invalid={Boolean(err("fullName"))} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.login} htmlFor="s-login" error={err("login")}>
          <Input id="s-login" name="login" defaultValue={initial?.login} autoCapitalize="none" required aria-invalid={Boolean(err("login"))} />
        </FormField>
        <FormField
          label={editing ? ru.common.newPassword : ru.common.password}
          htmlFor="s-password"
          error={err("password")}
          hint={editing ? ru.common.passwordHint : undefined}
        >
          <Input id="s-password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(err("password"))} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.phone} htmlFor="s-phone" error={err("phone")}>
          <Input id="s-phone" name="phone" type="tel" defaultValue={initial?.phone} aria-invalid={Boolean(err("phone"))} />
        </FormField>
        <FormField label={ru.common.parentPhone} htmlFor="s-parentPhone" error={err("parentPhone")}>
          <Input id="s-parentPhone" name="parentPhone" type="tel" defaultValue={initial?.parentPhone} aria-invalid={Boolean(err("parentPhone"))} />
        </FormField>
      </div>
      <FormField label={ru.common.birthDate} htmlFor="s-birthDate" error={err("birthDate")}>
        <Input id="s-birthDate" name="birthDate" type="date" defaultValue={initial?.birthDate} aria-invalid={Boolean(err("birthDate"))} />
      </FormField>
      {!editing && groups.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-bold">{ru.common.groups}</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <label key={g.id} className="inset-field flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm has-checked:ring-2 has-checked:ring-brass">
                <input type="checkbox" name="groupIds" value={g.id} className="size-4 accent-[#b8893a]" />
                {g.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <FormError state={state} />
      <SubmitButton className="w-full sm:w-auto sm:justify-self-end">{editing ? ru.common.save : ru.common.create}</SubmitButton>
    </form>
  );
}
