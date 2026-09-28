"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

export type FormState = ActionResult<unknown> | null;

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-sm font-bold text-ink-red" role="alert" data-testid={`error-${htmlFor}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: "default" | "destructive" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? ru.common.saving : children}
    </Button>
  );
}

export function FormError({ state }: { state: FormState }) {
  if (!state || state.ok) return null;
  return (
    <p className="stamp stamp-red w-full justify-start py-2 text-sm normal-case" role="alert" data-testid="form-error">
      {state.error}
    </p>
  );
}

/** Показывает тост по результату действия и вызывает onSuccess один раз на каждый новый результат. */
export function useActionFeedback(state: FormState, onSuccess?: () => void) {
  const last = useRef<FormState>(null);
  const callback = useRef(onSuccess);
  useEffect(() => {
    callback.current = onSuccess;
  });
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      callback.current?.();
    } else if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) {
      toast.error(state.error);
    }
  }, [state]);
}

export function fieldError(state: FormState, name: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}
