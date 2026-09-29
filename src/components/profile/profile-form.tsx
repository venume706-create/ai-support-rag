"use client";

import { useActionState, useState } from "react";
import type { Role } from "@prisma/client";
import { adminUpdateProfile } from "@/app/actions/admin";
import { updateOwnProfile } from "@/app/actions/profile";
import { useDialogClose } from "@/components/admin/dialog-form";
import { Avatar } from "@/components/common/avatar";
import { FormError, FormField, SubmitButton, fieldError, submitWith, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AVATAR_FRAMES, CARD_COLORS } from "@/lib/appearance";
import { ru } from "@/lib/i18n/ru";
import type { PersonLike } from "@/lib/person";
import { cn } from "@/lib/utils";
import { NicknameField } from "./nickname-field";

export interface ProfileValues extends PersonLike {
  bio: string;
  phone: string;
  email: string;
  birthDate: string;
  avatarFrame: string;
  cardColor: string;
  showInLeaderboard: boolean;
  parentPhone: string;
  subjectIds: string[];
}

const SWATCH: Record<(typeof CARD_COLORS)[number], string> = {
  cream: "bg-[#f5efe0]",
  sky: "bg-[#e3eef7]",
  mint: "bg-[#e2f1e6]",
  rose: "bg-[#f7e4e4]",
  lilac: "bg-[#ece4f5]",
};

/**
 * Профиль. mode="self" — человек правит свой (id берётся из сессии на сервере);
 * mode="admin" — администратор правит любой профиль (правки пишутся в журнал).
 */
export function ProfileForm({
  mode,
  role,
  user,
  subjects = [],
}: {
  mode: "self" | "admin";
  role: Role;
  user: ProfileValues;
  subjects?: { id: string; name: string }[];
}) {
  const admin = mode === "admin";
  const [state, action, pending] = useActionState<FormState, FormData>(admin ? adminUpdateProfile : updateOwnProfile, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, admin ? closeDialog : undefined);
  const [nickOk, setNickOk] = useState(true);
  const err = (name: string) => fieldError(state, name);
  const isStudent = role === "STUDENT";
  const isTeacher = role === "TEACHER";
  const id = admin ? "ap" : "pf";

  return (
    <form onSubmit={submitWith(action)} className="grid gap-5" noValidate data-testid="profile-form">
      {admin && <input type="hidden" name="userId" value={user.id} />}

      <NicknameField id={`${id}-nickname`} defaultValue={user.nickname ?? ""} serverError={err("nickname")} forUserId={admin ? user.id : undefined} required={!admin || Boolean(user.nickname)} onValidChange={setNickOk} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.firstName} htmlFor={`${id}-firstName`} error={err("firstName")}>
          <Input id={`${id}-firstName`} name="firstName" defaultValue={user.firstName} autoComplete="given-name" required aria-invalid={Boolean(err("firstName"))} />
        </FormField>
        <FormField label={ru.common.lastName} htmlFor={`${id}-lastName`} error={err("lastName")}>
          <Input id={`${id}-lastName`} name="lastName" defaultValue={user.lastName} autoComplete="family-name" required aria-invalid={Boolean(err("lastName"))} />
        </FormField>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">{ru.profile.nameSecond}</p>

      {admin ? (
        <FormField label={ru.profile.login} htmlFor={`${id}-login`} error={err("login")}>
          <Input id={`${id}-login`} name="login" defaultValue={user.login} autoCapitalize="none" autoComplete="off" required aria-invalid={Boolean(err("login"))} />
        </FormField>
      ) : (
        <FormField label={ru.profile.login} htmlFor={`${id}-login`} hint={ru.profile.loginHint}>
          <Input id={`${id}-login`} value={user.login} readOnly disabled />
        </FormField>
      )}

      <FormField label={ru.profile.bio} htmlFor={`${id}-bio`} error={err("bio")} hint={ru.profile.bioHint}>
        <Textarea id={`${id}-bio`} name="bio" defaultValue={user.bio} rows={3} maxLength={300} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={ru.common.phone} htmlFor={`${id}-phone`} error={err("phone")} hint={ru.profile.private}>
          <Input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" defaultValue={user.phone} autoComplete="tel" aria-invalid={Boolean(err("phone"))} />
        </FormField>
        <FormField label={ru.profile.email} htmlFor={`${id}-email`} error={err("email")} hint={ru.profile.private}>
          <Input id={`${id}-email`} name="email" type="email" inputMode="email" defaultValue={user.email} autoComplete="email" autoCapitalize="none" aria-invalid={Boolean(err("email"))} />
        </FormField>
      </div>
      <FormField label={ru.common.birthDate} htmlFor={`${id}-birthDate`} error={err("birthDate")} hint={ru.profile.private}>
        <Input id={`${id}-birthDate`} name="birthDate" type="date" defaultValue={user.birthDate} autoComplete="bday" aria-invalid={Boolean(err("birthDate"))} />
      </FormField>

      {admin && isStudent && (
        <FormField label={ru.common.parentPhone} htmlFor={`${id}-parentPhone`} error={err("parentPhone")}>
          <Input id={`${id}-parentPhone`} name="parentPhone" type="tel" inputMode="tel" defaultValue={user.parentPhone} aria-invalid={Boolean(err("parentPhone"))} />
        </FormField>
      )}

      {admin && isTeacher && (
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-bold">{ru.common.subjects}</legend>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <label key={s.id} className="inset-field flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm has-checked:ring-2 has-checked:ring-brass">
                <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={user.subjectIds.includes(s.id)} className="size-5 accent-[#b8893a]" />
                {s.name}
              </label>
            ))}
          </div>
          {err("subjectIds") && <p className="text-sm font-bold text-ink-red" role="alert">{err("subjectIds")}</p>}
        </fieldset>
      )}

      {isStudent && (
        <fieldset className="grid gap-5 rounded-md border border-dashed border-border p-4">
          <legend className="px-2 font-serif text-lg font-bold">{ru.profile.appearance}</legend>
          <div className="grid gap-2">
            <p className="text-sm font-bold">{ru.profile.frame}</p>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={ru.profile.frame}>
              {AVATAR_FRAMES.map((f) => (
                <label key={f} className="flex min-h-11 cursor-pointer flex-col items-center gap-1.5 rounded-md p-2 text-xs has-checked:bg-brass/25 has-checked:font-bold has-focus-visible:ring-2 has-focus-visible:ring-ring">
                  <input type="radio" name="avatarFrame" value={f} defaultChecked={user.avatarFrame === f} className="sr-only" />
                  <Avatar user={user} size="sm" frame={f} />
                  {ru.profile.frames[f]}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-bold">{ru.profile.cardColor}</p>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={ru.profile.cardColor}>
              {CARD_COLORS.map((c) => (
                <label key={c} className="flex min-h-11 cursor-pointer flex-col items-center gap-1.5 rounded-md p-2 text-xs has-checked:bg-brass/25 has-checked:font-bold has-focus-visible:ring-2 has-focus-visible:ring-ring">
                  <input type="radio" name="cardColor" value={c} defaultChecked={user.cardColor === c} className="sr-only" />
                  <span className={cn("size-9 rounded-md border border-black/25 shadow-sm", SWATCH[c])} />
                  {ru.profile.colors[c]}
                </label>
              ))}
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="showInLeaderboard" defaultChecked={user.showInLeaderboard} className="mt-0.5 size-5 shrink-0 accent-[#b8893a]" data-testid="leaderboard-toggle" />
            <span>
              <span className="font-bold">{ru.profile.leaderboard}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ru.profile.leaderboardHint}</span>
            </span>
          </label>
        </fieldset>
      )}

      <FormError state={state} />
      <SubmitButton pending={pending} disabledWhen={!nickOk} className="w-full sm:w-auto sm:justify-self-end">
        {ru.common.save}
      </SubmitButton>
    </form>
  );
}
