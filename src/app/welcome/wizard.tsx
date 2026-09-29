"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { chooseInitialPassword, chooseNickname } from "@/app/actions/profile";
import { Avatar } from "@/components/common/avatar";
import { FormError, FormField, SubmitButton, fieldError, submitWith, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { NicknameField } from "@/components/profile/nickname-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ru } from "@/lib/i18n/ru";
import type { PersonLike } from "@/lib/person";
import { cn } from "@/lib/utils";

type Step = "nick" | "password" | "photo";

function Pips({ steps, current }: { steps: Step[]; current: Step }) {
  return (
    <ol className="mb-4 flex items-center justify-center gap-2" aria-label={ru.welcome.step(steps.indexOf(current) + 1, steps.length)}>
      {steps.map((s, i) => (
        <li key={s} className={cn("brass flex size-8 items-center justify-center rounded-full text-sm font-bold", s !== current && "opacity-45")} aria-current={s === current ? "step" : undefined}>
          {i + 1}
        </li>
      ))}
    </ol>
  );
}

function NickStep({ onDone }: { onDone: (nick: string) => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(chooseNickname, null);
  const [ok, setOk] = useState(false);
  const [nick, setNick] = useState("");
  useActionFeedback(state, () => onDone(nick));
  return (
    <form
      onSubmit={(e) => {
        setNick(String(new FormData(e.currentTarget).get("nickname") ?? "").trim());
        submitWith(action)(e);
      }}
      className="grid gap-4"
      noValidate
      data-testid="wizard-nick"
    >
      <p className="text-sm text-muted-foreground">{ru.welcome.stepNickText}</p>
      <NicknameField id="w-nickname" serverError={fieldError(state, "nickname")} onValidChange={setOk} />
      <FormError state={state} />
      <SubmitButton pending={pending} disabledWhen={!ok} className="w-full">
        {ru.welcome.next}
      </SubmitButton>
    </form>
  );
}

function PasswordStep({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(chooseInitialPassword, null);
  useActionFeedback(state, onDone);
  const err = (n: string) => fieldError(state, n);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4" noValidate data-testid="wizard-password">
      <p className="text-sm text-muted-foreground">{ru.welcome.stepPasswordText}</p>
      <FormField label={ru.account.next} htmlFor="w-next" error={err("next")} hint={ru.validation.passwordMin}>
        <Input id="w-next" name="next" type="password" autoComplete="new-password" required aria-invalid={Boolean(err("next"))} />
      </FormField>
      <FormField label={ru.account.confirm} htmlFor="w-confirm" error={err("confirm")}>
        <Input id="w-confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={Boolean(err("confirm"))} />
      </FormField>
      <FormError state={state} />
      <SubmitButton pending={pending} className="w-full">
        {ru.welcome.next}
      </SubmitButton>
    </form>
  );
}

function PhotoStep({ person, nick, onFinish }: { person: PersonLike; nick: string; onFinish: () => void }) {
  const [hasPhoto, setHasPhoto] = useState(Boolean(person.avatarKey));
  return (
    <div className="grid gap-4" data-testid="wizard-photo">
      <p className="text-sm text-muted-foreground">{ru.welcome.stepPhotoText}</p>
      <AvatarUploader user={{ ...person, nickname: nick }} refresh={false} onChanged={(has) => setHasPhoto(has)} />
      <Button onClick={onFinish} size="lg" className="w-full" data-testid="wizard-finish">
        {hasPhoto ? ru.welcome.finish : ru.welcome.skip}
      </Button>
    </div>
  );
}

export function WelcomeWizard({ home, needNickname, needPassword, person }: { home: string; needNickname: boolean; needPassword: boolean; person: PersonLike }) {
  const router = useRouter();
  const steps: Step[] = [...(needNickname ? (["nick"] as const) : []), ...(needPassword ? (["password"] as const) : []), "photo"];
  const [step, setStep] = useState<Step>(steps[0]);
  const [nick, setNick] = useState(person.nickname ?? "");

  const next = () => setStep(steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)]);
  const titles: Record<Step, string> = { nick: ru.welcome.stepNick, password: ru.welcome.stepPassword, photo: ru.welcome.stepPhoto };

  function finish() {
    router.replace(home);
    router.refresh();
  }

  return (
    <div className="paper relative z-10 rounded-md p-5 sm:p-6">
      <Pips steps={steps} current={step} />
      {nick && step !== "nick" && (
        <p className="mb-3 flex items-center justify-center gap-2 font-serif text-lg font-bold" data-testid="wizard-hello">
          <Avatar user={{ ...person, nickname: nick }} size="sm" />
          {ru.welcome.hello(nick)}
        </p>
      )}
      <h2 className="mb-1 text-center font-serif text-xl font-bold">{titles[step]}</h2>
      <p className="mb-4 text-center text-xs font-bold text-muted-foreground">{ru.welcome.step(steps.indexOf(step) + 1, steps.length)}</p>
      {step === "nick" && (
        <NickStep
          onDone={(n) => {
            setNick(n);
            next();
          }}
        />
      )}
      {step === "password" && <PasswordStep onDone={next} />}
      {step === "photo" && <PhotoStep person={person} nick={nick} onFinish={finish} />}
    </div>
  );
}
