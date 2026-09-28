import type { Metadata } from "next";
import { ForbiddenView } from "@/components/common/status-views";
import { ru } from "@/lib/i18n/ru";

export const metadata: Metadata = { title: ru.errors.forbiddenTitle };

/** Цель rewrite из proxy.ts, когда роль не совпадает с разделом (ответ 403). */
export default function ForbiddenPage() {
  return <ForbiddenView />;
}
