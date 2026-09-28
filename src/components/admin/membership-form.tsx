"use client";

import { useActionState, useRef } from "react";
import { addStudentToGroup } from "@/app/actions/admin";
import { FormError, SubmitButton, submitWith, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { NativeSelect } from "@/components/ui/native-select";
import { ru } from "@/lib/i18n/ru";

/** Добавление ученика в группу. Режим group: выбираем ученика; режим student: выбираем группу. */
export function MembershipForm({
  fixed,
  options,
  emptyText = ru.admin.noFreeStudents,
}: {
  fixed: { groupId: string } | { studentId: string };
  options: { id: string; name: string }[];
  emptyText?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addStudentToGroup, null);
  const form = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => form.current?.reset());
  const selectName = "groupId" in fixed ? "studentId" : "groupId";
  if (options.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <form ref={form} onSubmit={submitWith(action)} className="grid gap-2 sm:flex sm:items-start" data-testid="membership-form">
      {"groupId" in fixed ? <input type="hidden" name="groupId" value={fixed.groupId} /> : <input type="hidden" name="studentId" value={fixed.studentId} />}
      <NativeSelect name={selectName} defaultValue="" required aria-label={"groupId" in fixed ? ru.admin.selectStudent : ru.common.group} className="sm:w-72">
        <option value="" disabled>
          {"groupId" in fixed ? ru.admin.selectStudent : ru.common.group}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </NativeSelect>
      <SubmitButton pending={pending}>{ru.common.add}</SubmitButton>
      <FormError state={state} />
    </form>
  );
}
