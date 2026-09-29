import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ActionError } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { fieldErrors } from "@/lib/validation";

/** FormData → объект; поля из `arrays` собираются в массивы (мультивыбор). */
export function formToObject(formData: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = arrays.includes(key) ? formData.getAll(key).map(String) : String(formData.get(key) ?? "");
  }
  for (const key of arrays) if (!(key in out)) out[key] = [];
  return out;
}

/** Проверка данных по zod-схеме; при ошибке — ActionError с сообщениями по полям. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ActionError(ru.errors.validation, fieldErrors(result.error));
  return result.data;
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
