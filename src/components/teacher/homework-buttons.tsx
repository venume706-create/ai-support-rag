"use client";

import { Trash2 } from "lucide-react";
import { deleteHomework } from "@/app/actions/teacher";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { ru } from "@/lib/i18n/ru";

export function DeleteHomeworkButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      label={ru.common.delete}
      size="sm"
      icon={<Trash2 />}
      title={`${ru.common.delete}: ${title}`}
      description={ru.common.confirmDelete}
      confirmLabel={ru.common.delete}
      action={() => deleteHomework(id)}
    />
  );
}
