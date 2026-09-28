"use client";

import { useActionState, useRef } from "react";
import { changeOwnPassword } from "@/app/actions/account";
import { FormError, FormField, SubmitButton, submitWith, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changeOwnPassword, null);
  const form = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => form.current?.reset());
  const err = (name: string) => fieldError(state, name);
  return (
    <form ref={form} onSubmit={submitWith(action)} className="grid gap-4" noValidate data-testid="password-form">
      <FormField label={ru.account.current} htmlFor="pw-current" error={err("current")}>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required aria-invalid={Boolean(err("current"))} />
      </FormField>
      <FormField label={ru.account.next} htmlFor="pw-next" error={err("next")} hint={ru.validation.passwordMin}>
        <Input id="pw-next" name="next" type="password" autoComplete="new-password" required aria-invalid={Boolean(err("next"))} />
      </FormField>
      <FormField label={ru.account.confirm} htmlFor="pw-confirm" error={err("confirm")}>
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={Boolean(err("confirm"))} />
      </FormField>
      <FormError state={state} />
      <SubmitButton pending={pending} className="w-full sm:w-auto sm:justify-self-start">{ru.account.submit}</SubmitButton>
    </form>
  );
}
