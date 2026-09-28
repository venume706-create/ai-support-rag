"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { deleteGroup, deleteSlot, generateLessons, removeStudentFromGroup } from "@/app/actions/admin";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";

export function DeleteGroupButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmAction
      label={ru.common.delete}
      icon={<Trash2 />}
      title={`${ru.common.delete}: ${name}`}
      description={`${ru.admin.groupDeleteHint} ${ru.common.confirmDelete}`}
      confirmLabel={ru.common.delete}
      action={() => deleteGroup(id)}
      redirectTo="/admin/groups"
      testId="delete-group"
    />
  );
}

export function DeleteSlotButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmAction
      label={ru.common.delete}
      size="icon"
      icon={<Trash2 />}
      title={`${ru.common.delete}: ${label}`}
      description={ru.common.confirmDelete}
      confirmLabel={ru.common.delete}
      action={() => deleteSlot(id)}
    />
  );
}

export function RemoveMemberButton({ groupId, studentId, label }: { groupId: string; studentId: string; label: string }) {
  return (
    <ConfirmAction
      variant="outline"
      size="icon"
      label={ru.common.remove}
      icon={<UserMinus />}
      title={`${ru.common.remove}: ${label}`}
      description={ru.admin.studentRemoved}
      confirmLabel={ru.common.remove}
      action={() => removeStudentFromGroup(groupId, studentId)}
    />
  );
}

export function GenerateLessonsButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await generateLessons();
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
      {ru.admin.generateLessons}
    </Button>
  );
}
