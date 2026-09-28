"use client";

import { Power, PowerOff, Trash2 } from "lucide-react";
import { deleteStudent, deleteTeacher, setUserActive } from "@/app/actions/admin";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { ru } from "@/lib/i18n/ru";

export function UserActions({
  userId,
  isActive,
  name,
  kind,
  entityId,
}: {
  userId: string;
  isActive: boolean;
  name: string;
  kind: "teacher" | "student";
  entityId: string;
}) {
  const deleteHint = kind === "teacher" ? ru.admin.teacherDeleteHint : ru.admin.studentDeleteHint;
  return (
    <>
      <ConfirmAction
        variant="outline"
        label={isActive ? ru.common.deactivate : ru.common.activate}
        icon={isActive ? <PowerOff /> : <Power />}
        title={`${isActive ? ru.common.deactivate : ru.common.activate}: ${name}`}
        description={isActive ? ru.auth.inactive : ru.common.active}
        confirmLabel={isActive ? ru.common.deactivate : ru.common.activate}
        action={() => setUserActive(userId, !isActive)}
        testId="toggle-active"
      />
      <ConfirmAction
        label={ru.common.delete}
        icon={<Trash2 />}
        title={`${ru.common.delete}: ${name}`}
        description={`${deleteHint} ${ru.common.confirmDelete}`}
        confirmLabel={ru.common.delete}
        action={() => (kind === "teacher" ? deleteTeacher(entityId) : deleteStudent(entityId))}
        redirectTo={kind === "teacher" ? "/admin/teachers" : "/admin/students"}
        testId="delete-user"
      />
    </>
  );
}
