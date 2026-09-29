"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ActionError, requireActionUser, runAction, type ActionResult } from "@/lib/access";
import { addDays, parseDateOnly, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { ensureLessons } from "@/lib/lessons";
import { fullNameOf, userSearchKey } from "@/lib/profile";
import {
  fieldErrors,
  groupSchema,
  idOnlySchema,
  membershipSchema,
  slotSchema,
  studentCreateSchema,
  studentUpdateSchema,
  subjectSchema,
  teacherCreateSchema,
  teacherUpdateSchema,
} from "@/lib/validation";

type State = ActionResult<unknown> | null;

/** FormData → объект; поля из `arrays` собираются в массивы (мультивыбор). */
function formToObject(formData: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = arrays.includes(key) ? formData.getAll(key).map(String) : String(formData.get(key) ?? "");
  }
  for (const key of arrays) if (!(key in out)) out[key] = [];
  return out;
}

function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ActionError(ru.errors.validation, fieldErrors(result.error));
  return result.data;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function assertLoginFree(login: string, exceptUserId?: string) {
  const existing = await db.user.findUnique({ where: { login }, select: { id: true } });
  if (existing && existing.id !== exceptUserId) {
    throw new ActionError(ru.errors.validation, { login: ru.errors.loginTaken });
  }
}

async function assertSubjectsExist(ids: string[]) {
  const count = await db.subject.count({ where: { id: { in: ids } } });
  if (count !== new Set(ids).size) throw new ActionError(ru.errors.validation, { subjectIds: ru.errors.notFound });
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

/* ---------------- Учителя ---------------- */

export async function createTeacher(_prev: State, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(teacherCreateSchema, formToObject(formData, ["subjectIds"]));
    await assertLoginFree(data.login);
    await assertSubjectsExist(data.subjectIds);
    const user = await db.user.create({
      data: {
        login: data.login,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: "TEACHER",
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: fullNameOf(data.firstName, data.lastName),
        searchKey: userSearchKey(data),
        phone: data.phone,
        mustChangePassword: true,
        teacher: { create: { subjects: { connect: data.subjectIds.map((id) => ({ id })) } } },
      },
      select: { teacher: { select: { id: true } } },
    });
    refreshAdmin();
    return { ok: true, message: ru.admin.teacherCreated, data: { id: user.teacher!.id } };
  });
}

export async function updateTeacher(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(teacherUpdateSchema, formToObject(formData, ["subjectIds"]));
    const teacher = await db.teacher.findUnique({ where: { id: data.id }, select: { userId: true, user: { select: { nickname: true } } } });
    if (!teacher) throw new ActionError(ru.errors.notFound);
    await assertLoginFree(data.login, teacher.userId);
    await assertSubjectsExist(data.subjectIds);
    await db.user.update({
      where: { id: teacher.userId },
      data: {
        login: data.login,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: fullNameOf(data.firstName, data.lastName),
        searchKey: userSearchKey({ ...data, nickname: teacher.user.nickname }),
        phone: data.phone,
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
        teacher: { update: { subjects: { set: data.subjectIds.map((id) => ({ id })) } } },
      },
    });
    refreshAdmin();
    return { ok: true, message: ru.admin.teacherUpdated };
  });
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const { id: teacherId } = parse(idOnlySchema, { id });
    const teacher = await db.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher) throw new ActionError(ru.errors.notFound);
    // Группы остаются без учителя (onDelete: SetNull)
    await db.user.delete({ where: { id: teacher.userId } });
    refreshAdmin();
    return { ok: true, message: ru.admin.teacherDeleted };
  });
}

/* ---------------- Ученики ---------------- */

export async function createStudent(_prev: State, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(studentCreateSchema, formToObject(formData, ["groupIds"]));
    await assertLoginFree(data.login);
    const groupCount = await db.group.count({ where: { id: { in: data.groupIds } } });
    if (groupCount !== new Set(data.groupIds).size) throw new ActionError(ru.errors.validation, { groupIds: ru.errors.notFound });
    const user = await db.user.create({
      data: {
        login: data.login,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: "STUDENT",
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: fullNameOf(data.firstName, data.lastName),
        searchKey: userSearchKey(data),
        phone: data.phone,
        birthDate: data.birthDate ? parseDateOnly(data.birthDate) : null,
        mustChangePassword: true,
        student: {
          create: {
            parentPhone: data.parentPhone,
            groups: { create: [...new Set(data.groupIds)].map((groupId) => ({ groupId })) },
          },
        },
      },
      select: { student: { select: { id: true } } },
    });
    refreshAdmin();
    return { ok: true, message: ru.admin.studentCreated, data: { id: user.student!.id } };
  });
}

export async function updateStudent(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(studentUpdateSchema, formToObject(formData));
    const student = await db.student.findUnique({ where: { id: data.id }, select: { userId: true, user: { select: { nickname: true } } } });
    if (!student) throw new ActionError(ru.errors.notFound);
    await assertLoginFree(data.login, student.userId);
    await db.user.update({
      where: { id: student.userId },
      data: {
        login: data.login,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: fullNameOf(data.firstName, data.lastName),
        searchKey: userSearchKey({ ...data, nickname: student.user.nickname }),
        phone: data.phone,
        birthDate: data.birthDate ? parseDateOnly(data.birthDate) : null,
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
        student: {
          update: { parentPhone: data.parentPhone },
        },
      },
    });
    refreshAdmin();
    return { ok: true, message: ru.admin.studentUpdated };
  });
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const { id: studentId } = parse(idOnlySchema, { id });
    const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (!student) throw new ActionError(ru.errors.notFound);
    await db.user.delete({ where: { id: student.userId } });
    refreshAdmin();
    return { ok: true, message: ru.admin.studentDeleted };
  });
}

/* ---------------- Активность пользователя ---------------- */

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const { id } = parse(idOnlySchema, { id: userId });
    if (id === admin.id && !active) throw new ActionError(ru.errors.cannotDeactivateSelf);
    await db.user.update({ where: { id }, data: { isActive: active } });
    refreshAdmin();
    return { ok: true, message: active ? ru.admin.userActivated : ru.admin.userDeactivated };
  });
}

/* ---------------- Группы ---------------- */

async function validateGroupRefs(subjectId: string, teacherId: string | null) {
  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
  if (!subject) throw new ActionError(ru.errors.validation, { subjectId: ru.errors.notFound });
  if (teacherId) {
    const teacher = await db.teacher.findUnique({
      where: { id: teacherId },
      select: { subjects: { select: { id: true } } },
    });
    if (!teacher) throw new ActionError(ru.errors.validation, { teacherId: ru.errors.notFound });
    if (!teacher.subjects.some((s) => s.id === subjectId)) {
      throw new ActionError(ru.errors.validation, { teacherId: ru.errors.teacherSubjectMismatch });
    }
  }
}

export async function saveGroup(_prev: State, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(groupSchema, formToObject(formData));
    await validateGroupRefs(data.subjectId, data.teacherId);
    const payload = { name: data.name, subjectId: data.subjectId, teacherId: data.teacherId, level: data.level };
    try {
      const group = data.id
        ? await db.group.update({ where: { id: data.id }, data: payload, select: { id: true } })
        : await db.group.create({ data: payload, select: { id: true } });
      refreshAdmin();
      revalidatePath("/teacher", "layout");
      return { ok: true, message: data.id ? ru.admin.groupUpdated : ru.admin.groupCreated, data: { id: group.id } };
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.validation, { name: ru.errors.groupNameTaken });
      throw error;
    }
  });
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const { id: groupId } = parse(idOnlySchema, { id });
    await db.group.delete({ where: { id: groupId } });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    return { ok: true, message: ru.admin.groupDeleted };
  });
}

export async function addStudentToGroup(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(membershipSchema, formToObject(formData));
    const [group, student] = await Promise.all([
      db.group.findUnique({ where: { id: data.groupId }, select: { id: true } }),
      db.student.findUnique({ where: { id: data.studentId }, select: { id: true } }),
    ]);
    if (!group || !student) throw new ActionError(ru.errors.notFound);
    try {
      await db.groupStudent.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.alreadyInGroup);
      throw error;
    }
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    return { ok: true, message: ru.admin.studentAdded };
  });
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(membershipSchema, { groupId, studentId });
    await db.groupStudent.delete({ where: { groupId_studentId: data } });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    return { ok: true, message: ru.admin.studentRemoved };
  });
}

/* ---------------- Расписание ---------------- */

export async function createSlot(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(slotSchema, formToObject(formData));
    const group = await db.group.findUnique({ where: { id: data.groupId }, select: { id: true } });
    if (!group) throw new ActionError(ru.errors.validation, { groupId: ru.errors.notFound });
    await db.scheduleSlot.create({ data });
    // Сразу создаём уроки на ближайшие две недели
    const now = today();
    await ensureLessons(db, [data.groupId], now, addDays(now, 13));
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    revalidatePath("/student", "layout");
    return { ok: true, message: ru.admin.slotCreated };
  });
}

export async function deleteSlot(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const { id: slotId } = parse(idOnlySchema, { id });
    const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new ActionError(ru.errors.notFound);
    await db.$transaction(async (tx) => {
      await tx.scheduleSlot.delete({ where: { id: slot.id } });
      // Будущие уроки этого слота без отметок и оценок больше не нужны; прошедшие остаются в истории
      const future = await tx.lesson.findMany({
        where: {
          groupId: slot.groupId,
          startTime: slot.startTime,
          date: { gte: today() },
          attendance: { none: {} },
          grades: { none: {} },
        },
        select: { id: true, date: true },
      });
      const ids = future.filter((l) => (l.date.getUTCDay() || 7) === slot.dayOfWeek).map((l) => l.id);
      if (ids.length) await tx.lesson.deleteMany({ where: { id: { in: ids } } });
    });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    revalidatePath("/student", "layout");
    return { ok: true, message: ru.admin.slotDeleted };
  });
}

export async function generateLessons(): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const groups = await db.group.findMany({ select: { id: true } });
    const now = today();
    const created = await ensureLessons(db, groups.map((g) => g.id), now, addDays(now, 13));
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    revalidatePath("/student", "layout");
    return { ok: true, message: ru.admin.lessonsGenerated(created) };
  });
}

/* ---------------- Предметы ---------------- */

export async function createSubject(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const data = parse(subjectSchema, formToObject(formData));
    try {
      await db.subject.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.validation, { name: ru.errors.subjectNameTaken });
      throw error;
    }
    refreshAdmin();
    return { ok: true, message: ru.admin.subjectCreated };
  });
}

export async function renameSubject(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const { id } = parse(idOnlySchema, { id: formData.get("id") });
    const data = parse(subjectSchema, { name: formData.get("name") });
    try {
      await db.subject.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.validation, { name: ru.errors.subjectNameTaken });
      throw error;
    }
    refreshAdmin();
    return { ok: true, message: ru.admin.subjectUpdated };
  });
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionUser("ADMIN");
    const { id: subjectId } = parse(idOnlySchema, { id });
    const groups = await db.group.count({ where: { subjectId } });
    if (groups > 0) throw new ActionError(ru.errors.subjectInUse);
    await db.subject.delete({ where: { id: subjectId } });
    refreshAdmin();
    return { ok: true, message: ru.admin.subjectDeleted };
  });
}
