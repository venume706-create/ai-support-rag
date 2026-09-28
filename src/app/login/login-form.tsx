"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ru } from "@/lib/i18n/ru";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="grid gap-2">
        <Label htmlFor="login">{ru.common.login}</Label>
        <Input id="login" name="login" autoComplete="username" autoCapitalize="none" required aria-invalid={Boolean(state.error)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{ru.common.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(state.error)} />
      </div>
      {state.error && (
        <p role="alert" className="stamp stamp-red w-full justify-start py-2 text-sm normal-case" data-testid="login-error">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? ru.auth.submitting : ru.auth.submit}
      </Button>
    </form>
  );
}
