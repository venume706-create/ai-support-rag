"use client";

import { useActionState } from "react";
import { createSlot } from "@/app/actions/admin";
import { FormError, FormField, SubmitButton, submitWith, fieldError, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ru } from "@/lib/i18n/ru";
import { useDialogClose } from "./dialog-form";

export function SlotForm({ groups, groupId, onDone }: { groups?: { id: string; name: string }[]; groupId?: string; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSlot, null);
  const closeDialog = useDialogClose();
  useActionFeedback(state, onDone ?? closeDialog);
  const err = (name: string) => fieldError(state, name);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4" noValidate data-testid="slot-form">
      {groupId ? (
        <input type="hidden" name="groupId" value={groupId} />
      ) : (
        <FormField label={ru.common.group} htmlFor="sl-group" error={err("groupId")}>
          <NativeSelect id="sl-group" name="groupId" defaultValue="" required>
            <option value="" disabled>
              {ru.common.group}
            </option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}
      <FormField label={ru.admin.dayOfWeek} htmlFor="sl-day" error={err("dayOfWeek")}>
        <NativeSelect id="sl-day" name="dayOfWeek" defaultValue="1">
          {ru.common.weekdays.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={ru.admin.startTime} htmlFor="sl-start" error={err("startTime")}>
          <Input id="sl-start" name="startTime" type="time" defaultValue="15:00" required />
        </FormField>
        <FormField label={ru.admin.endTime} htmlFor="sl-end" error={err("endTime")}>
          <Input id="sl-end" name="endTime" type="time" defaultValue="16:30" required />
        </FormField>
      </div>
      <FormField label={ru.common.room} htmlFor="sl-room" error={err("room")}>
        <Input id="sl-room" name="room" />
      </FormField>
      <FormError state={state} />
      <SubmitButton pending={pending} className="w-full sm:w-auto sm:justify-self-end">{ru.common.add}</SubmitButton>
    </form>
  );
}
