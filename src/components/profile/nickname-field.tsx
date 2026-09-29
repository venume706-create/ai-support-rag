"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { FormField } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";
import { checkNicknameFormat } from "@/lib/profile";
import { cn } from "@/lib/utils";

type RemoteResult = { available: true; own: boolean } | { available: false; text: string } | "offline";
type View = { kind: "idle" } | { kind: "checking" } | { kind: "free"; own: boolean } | { kind: "bad"; text: string };

/**
 * Ник с проверкой «на лету»: формат проверяется сразу на месте,
 * занятость — запросом к серверу (с небольшой задержкой, пока человек печатает).
 */
export function NicknameField({
  id = "nickname",
  defaultValue = "",
  serverError,
  forUserId,
  required = true,
  onValidChange,
  label = ru.profile.nickname,
  hint = ru.profile.nicknameHint,
}: {
  id?: string;
  defaultValue?: string;
  serverError?: string;
  /** Администратор правит чужой профиль: ник этого человека считается «своим» */
  forUserId?: string;
  required?: boolean;
  onValidChange?: (valid: boolean) => void;
  label?: string;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [remote, setRemote] = useState<{ nick: string; result: RemoteResult } | null>(
    defaultValue ? { nick: defaultValue.trim(), result: { available: true, own: true } } : null,
  );

  // Всё, что можно вычислить из значения поля, вычисляем при показе, а не храним в состоянии
  const nick = value.trim();
  const formatProblem = nick === "" ? null : checkNicknameFormat(nick);
  const known = remote && remote.nick === nick ? remote.result : null;

  let state: View;
  if (nick === "") state = { kind: "idle" };
  else if (formatProblem) state = { kind: "bad", text: ru.validation.nickname[formatProblem] };
  else if (known === null) state = { kind: "checking" };
  else if (known === "offline") state = { kind: "idle" };
  else if (known.available) state = { kind: "free", own: known.own };
  else state = { kind: "bad", text: known.text };

  const valid = nick === "" ? !required : state.kind === "free" || known === "offline";

  const notify = useRef(onValidChange);
  useEffect(() => {
    notify.current = onValidChange;
  });
  useEffect(() => {
    notify.current?.(valid);
  }, [valid]);

  // Запрос к серверу — только когда формат верный и ответа на этот ник ещё нет
  const needsCheck = nick !== "" && !formatProblem && known === null;
  useEffect(() => {
    if (!needsCheck) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ nick, ...(forUserId ? { userId: forUserId } : {}) });
        const res = await fetch(`/api/nickname?${qs}`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { available: boolean; own?: boolean; reason?: string };
        setRemote({
          nick,
          result: body.available
            ? { available: true, own: Boolean(body.own) }
            : { available: false, text: body.reason === "taken" ? ru.profile.taken : ru.validation.nickname[(body.reason as "short") ?? "chars"] },
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // Сеть недоступна: не блокируем форму, окончательную проверку сделает сервер
        setRemote({ nick, result: "offline" });
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needsCheck, nick, forUserId]);

  const problem = state.kind === "bad" ? state.text : serverError;
  const isOwn = state.kind === "free" && state.own && defaultValue !== "" && nick === defaultValue.trim();
  return (
    <FormField label={label} htmlFor={id} error={problem} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          name="nickname"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          required={required}
          aria-invalid={Boolean(problem)}
          aria-describedby={`${id}-status`}
          className="pr-10"
          data-testid="nickname-input"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" aria-hidden>
          {state.kind === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {state.kind === "free" && <Check className="size-5 text-ink-green" />}
          {state.kind === "bad" && <X className="size-5 text-ink-red" />}
        </span>
      </div>
      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={cn("min-h-5 text-sm font-bold", state.kind === "free" ? "text-ink-green" : "text-muted-foreground")}
        data-testid="nickname-status"
      >
        {state.kind === "checking" && ru.profile.checking}
        {state.kind === "free" && (isOwn ? ru.profile.yours : ru.profile.free)}
      </p>
    </FormField>
  );
}
