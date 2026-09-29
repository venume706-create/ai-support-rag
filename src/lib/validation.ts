import { z } from "zod";
import { ru } from "@/lib/i18n/ru";
import { isValidTime } from "@/lib/dates";
import { AVATAR_FRAMES, CARD_COLORS } from "@/lib/appearance";
import { checkNicknameFormat } from "@/lib/profile";

const v = ru.validation;

const trimmed = (max = 200) => z.string().trim().max(max, v.tooLong);
const idSchema = z.string().trim().min(1, v.required).max(64);
const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, v.date)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), v.date);
const optionalDate = z.union([z.literal(""), dateString]).optional().transform((s) => (s ? s : null));
const phone = z
  .string()
  .trim()
  .max(32, v.tooLong)
  .regex(/^[0-9+\-()\s]*$/, v.phone);
const time = z.string().trim().refine(isValidTime, v.time);

export const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1, v.required).max(32, v.tooLong),
  password: z.string().min(1, v.required).max(128, v.tooLong),
});

const loginField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, v.loginFormat);
const passwordField = z.string().min(6, v.passwordMin).max(128, v.tooLong);
const nameField = trimmed(60).pipe(z.string().min(2, v.nameMin));

export const teacherCreateSchema = z.object({
  login: loginField,
  password: passwordField,
  firstName: nameField,
  lastName: nameField,
  subjectIds: z.array(idSchema).min(1, v.subjectRequired),
});

export const studentCreateSchema = z.object({
  login: loginField,
  password: passwordField,
  firstName: nameField,
  lastName: nameField,
  parentPhone: phone.default(""),
  groupIds: z.array(idSchema).default([]),
});

export const groupSchema = z.object({
  id: idSchema.optional(),
  name: trimmed(80).pipe(z.string().min(2, v.nameMin)),
  subjectId: idSchema,
  teacherId: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((s) => (s ? s : null)),
  level: trimmed(40),
});

export const subjectSchema = z.object({
  name: trimmed(60).pipe(z.string().min(2, v.nameMin)),
});

export const slotSchema = z
  .object({
    groupId: idSchema,
    dayOfWeek: z.coerce.number().int(v.dayOfWeek).min(1, v.dayOfWeek).max(7, v.dayOfWeek),
    startTime: time,
    endTime: time,
    room: trimmed(30),
  })
  .refine((s) => s.endTime > s.startTime, { message: ru.errors.timeOrder, path: ["endTime"] });

export const membershipSchema = z.object({ groupId: idSchema, studentId: idSchema });

export const attendanceSchema = z.object({
  lessonId: idSchema,
  studentId: idSchema,
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
});

export const attendanceBulkSchema = z.object({
  lessonId: idSchema,
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
});

export const gradeSchema = z.object({
  lessonId: idSchema,
  studentId: idSchema,
  value: z.coerce.number().int(v.grade).min(1, v.grade).max(5, v.grade),
  comment: trimmed(200).default(""),
});

export const noteSchema = z.object({ studentId: idSchema, text: trimmed(500).pipe(z.string().min(1, v.required)) });

export const lessonTopicSchema = z.object({ lessonId: idSchema, topic: trimmed(200) });

export const homeworkSchema = z.object({
  id: idSchema.optional(),
  groupId: idSchema,
  title: trimmed(150).pipe(z.string().min(2, v.nameMin)),
  description: trimmed(2000).default(""),
  dueDate: dateString,
});

export const submissionSchema = z.object({
  homeworkId: idSchema,
  studentId: idSchema,
  status: z.enum(["DONE", "PARTIAL", "NOT_DONE"]),
});

export const nicknameField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const problem = checkNicknameFormat(value);
    if (problem) ctx.addIssue({ code: "custom", message: v.nickname[problem] });
  });

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((s) => s === "on" || s === "true");

const profileFields = {
  firstName: nameField,
  lastName: nameField,
  bio: trimmed(300).default(""),
  phone,
  email: z.union([z.literal(""), z.string().trim().max(120, v.tooLong).email(v.email)]).default(""),
  birthDate: optionalDate,
  avatarFrame: z.enum(AVATAR_FRAMES).catch("none").default("none"),
  cardColor: z.enum(CARD_COLORS).catch("cream").default("cream"),
  showInLeaderboard: checkbox,
};

/** Свой профиль (любая роль). Оформление и доска почёта применяются только к ученикам. */
export const profileSchema = z.object({ nickname: nicknameField, ...profileFields });

/** Профиль глазами администратора: плюс логин, ник может быть пустым (если человек ещё не выбрал). */
export const adminProfileSchema = z.object({
  userId: idSchema,
  login: loginField,
  nickname: z.union([z.literal(""), nicknameField]).default(""),
  parentPhone: phone.default(""),
  subjectIds: z.array(idSchema).default([]),
  ...profileFields,
});

export const nicknameOnlySchema = z.object({ nickname: nicknameField });

export const initialPasswordSchema = z
  .object({ next: passwordField, confirm: z.string().min(1, v.required) })
  .refine((d) => d.next === d.confirm, { message: ru.account.mismatch, path: ["confirm"] });

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, v.required).max(128, v.tooLong),
    next: passwordField,
    confirm: z.string().min(1, v.required),
  })
  .refine((d) => d.next === d.confirm, { message: ru.account.mismatch, path: ["confirm"] })
  .refine((d) => d.next !== d.current, { message: ru.account.sameAsOld, path: ["next"] });

export const idOnlySchema = z.object({ id: idSchema });

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  groupId: z.string().trim().max(64).optional().default(""),
  subjectId: z.string().trim().max(64).optional().default(""),
  teacherId: z.string().trim().max(64).optional().default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  period: z.enum(["month", "all"]).catch("all").default("all"),
  sort: z.enum(["rating", "name"]).catch("rating").default("rating"),
  status: z.enum(["", "active", "inactive"]).catch("").default(""),
  hw: z.enum(["", "open", "done", "overdue"]).catch("").default(""),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/** Разбор searchParams страницы в безопасный объект запроса. */
export function parseListQuery(sp: Record<string, string | string[] | undefined>): ListQuery {
  const flat = Object.fromEntries(Object.entries(sp).map(([k, val]) => [k, Array.isArray(val) ? val[0] : val]));
  const parsed = listQuerySchema.safeParse(flat);
  return parsed.success ? parsed.data : listQuerySchema.parse({});
}

/** Первые сообщения об ошибках по полям для показа в форме. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
