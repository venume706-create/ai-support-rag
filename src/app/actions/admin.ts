"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { formToObject, isUniqueViolation, parse } from "@/lib/action-utils";
import { ActionError, requireActionUser, runAction, type ActionResult } from "@/lib/access";
import { addDays, parseDateOnly, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { diffFields, writeAudit } from "@/lib/audit";
import { getStorage } from "@/lib/storage";
import { ensureLessons } from "@/lib/lessons";
import { nicknameStatus } from "@/lib/nickname";
import { generateTempPassword } from "@/lib/passwords";
import { fullNameOf, nicknameKey, userSearchKey } from "@/lib/profile";
import {
  adminProfileSchema,
  groupSchema,
  idOnlySchema,
  membershipSchema,
  slotSchema,
  studentCreateSchema,
  subjectSchema,
  teacherCreateSchema,
} from "@/lib/validation";

type State = ActionResult<unknown> | null;

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

/* ---------------- Учителя и ученики: создание и удаление ---------------- */

export async function createTeacher(_prev: State, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
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
        mustChangePassword: true,
        teacher: { create: { subjects: { connect: data.subjectIds.map((id) => ({ id })) } } },
      },
      select: { id: true, teacher: { select: { id: true } } },
    });
    await writeAudit(admin, "user_created", { type: "user", id: user.id, label: data.login }, { role: "TEACHER", name: fullNameOf(data.firstName, data.lastName) });
    refreshAdmin();
    return { ok: true, message: ru.admin.teacherCreated, data: { id: user.teacher!.id } };
  });
}

export async function createStudent(_prev: State, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
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
        mustChangePassword: true,
        student: {
          create: {
            parentPhone: data.parentPhone,
            groups: { create: [...new Set(data.groupIds)].map((groupId) => ({ groupId })) },
          },
        },
      },
      select: { id: true, student: { select: { id: true } } },
    });
    await writeAudit(admin, "user_created", { type: "user", id: user.id, label: data.login }, { role: "STUDENT", name: fullNameOf(data.firstName, data.lastName) });
    refreshAdmin();
    return { ok: true, message: ru.admin.studentCreated, data: { id: user.student!.id } };
  });
}

async function deleteAccount(admin: Awaited<ReturnType<typeof requireActionUser>>, userId: string, message: string): Promise<ActionResult> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, login: true, nickname: true, role: true, avatarKey: true } });
  if (!user) throw new ActionError(ru.errors.notFound);
  if (user.id === admin.id) throw new ActionError(ru.errors.cannotDeleteSelf);
  await db.user.delete({ where: { id: user.id } });
  if (user.avatarKey) await getStorage().delete(user.avatarKey).catch((e) => console.error("Не удалось удалить фото", e));
  await writeAudit(admin, "user_deleted", { type: "user", id: user.id, label: user.nickname ?? user.login }, { role: user.role, login: user.login });
  refreshAdmin();
  return { ok: true, message };
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const { id: teacherId } = parse(idOnlySchema, { id });
    const teacher = await db.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher) throw new ActionError(ru.errors.notFound);
    // Группы остаются без учителя (onDelete: SetNull)
    return deleteAccount(admin, teacher.userId, ru.admin.teacherDeleted);
  });
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const { id: studentId } = parse(idOnlySchema, { id });
    const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (!student) throw new ActionError(ru.errors.notFound);
    return deleteAccount(admin, student.userId, ru.admin.studentDeleted);
  });
}

/* ---------------- Профиль любого пользователя ---------------- */

/** Администратор правит чужой профиль. Каждая правка пишется в журнал (значения контактов не сохраняются). */
export async function adminUpdateProfile(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const data = parse(adminProfileSchema, formToObject(formData, ["subjectIds"]));
    const target = await db.user.findUnique({
      where: { id: data.userId },
      include: { teacher: { select: { id: true, subjects: { select: { id: true } } } }, student: { select: { id: true, parentPhone: true, showInLeaderboard: true } } },
    });
    if (!target) throw new ActionError(ru.errors.notFound);
    await assertLoginFree(data.login, target.id);

    let nickname: string | null = target.nickname;
    if (data.nickname !== "") {
      const status = await nicknameStatus(data.nickname, target.id);
      if (!status.available) {
        throw new ActionError(ru.errors.validation, { nickname: status.reason === "taken" ? ru.profile.taken : ru.validation.nickname[status.reason] });
      }
      nickname = data.nickname;
    } else if (target.nickname) {
      throw new ActionError(ru.errors.validation, { nickname: ru.validation.required });
    }
    if (target.teacher) {
      if (data.subjectIds.length === 0) throw new ActionError(ru.errors.validation, { subjectIds: ru.validation.subjectRequired });
      await assertSubjectsExist(data.subjectIds);
    }

    const before = {
      login: target.login,
      nickname: target.nickname,
      firstName: target.firstName,
      lastName: target.lastName,
      bio: target.bio,
      phone: target.phone,
      email: target.email,
      birthDate: target.birthDate?.toISOString().slice(0, 10) ?? "",
      avatarFrame: target.avatarFrame,
      cardColor: target.cardColor,
      parentPhone: target.student?.parentPhone ?? "",
      showInLeaderboard: target.student?.showInLeaderboard ?? true,
      subjects: (target.teacher?.subjects ?? []).map((x) => x.id).sort().join(","),
    };
    const after = {
      login: data.login,
      nickname,
      firstName: data.firstName,
      lastName: data.lastName,
      bio: data.bio,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate ?? "",
      avatarFrame: target.student ? data.avatarFrame : target.avatarFrame,
      cardColor: target.student ? data.cardColor : target.cardColor,
      parentPhone: target.student ? data.parentPhone : before.parentPhone,
      showInLeaderboard: target.student ? data.showInLeaderboard : before.showInLeaderboard,
      subjects: target.teacher ? [...data.subjectIds].sort().join(",") : before.subjects,
    };

    try {
      await db.user.update({
        where: { id: target.id },
        data: {
          login: data.login,
          nickname,
          nicknameKey: nickname ? nicknameKey(nickname) : null,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: fullNameOf(data.firstName, data.lastName),
          searchKey: userSearchKey({ nickname, firstName: data.firstName, lastName: data.lastName, login: data.login }),
          bio: data.bio,
          phone: data.phone,
          email: data.email,
          birthDate: data.birthDate ? parseDateOnly(data.birthDate) : null,
          ...(target.student
            ? {
                avatarFrame: data.avatarFrame,
                cardColor: data.cardColor,
                student: { update: { parentPhone: data.parentPhone, showInLeaderboard: data.showInLeaderboard } },
              }
            : {}),
          ...(target.teacher ? { teacher: { update: { subjects: { set: data.subjectIds.map((id) => ({ id })) } } } } : {}),
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(ru.errors.validation, { nickname: ru.profile.taken });
      throw error;
    }

    const changes = diffFields(before, after, ["phone", "email", "birthDate", "parentPhone", "bio"]);
    if (Object.keys(changes).length > 0) {
      await writeAudit(admin, "profile_edited", { type: "user", id: target.id, label: nickname ?? data.login }, changes);
    }
    refreshAdmin();
    return { ok: true, message: ru.profile.saved };
  });
}

/** Сброс пароля: человеку выдаётся временный, при входе он обязан задать свой. Пароль показывается администратору один раз. */
export async function resetUserPassword(userId: string): Promise<ActionResult<{ password: string }>> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const { id } = parse(idOnlySchema, { id: userId });
    if (id === admin.id) throw new ActionError(ru.errors.cannotResetSelf);
    const user = await db.user.findUnique({ where: { id }, select: { id: true, login: true, nickname: true } });
    if (!user) throw new ActionError(ru.errors.notFound);
    const password = generateTempPassword();
    await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true } });
    await writeAudit(admin, "password_reset", { type: "user", id, label: user.nickname ?? user.login });
    refreshAdmin();
    return { ok: true, message: ru.admin.passwordResetDone, data: { password } };
  });
}

/* ---------------- Блокировка аккаунта (вручную) ---------------- */

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const { id } = parse(idOnlySchema, { id: userId });
    if (id === admin.id && !active) throw new ActionError(ru.errors.cannotDeactivateSelf);
    const user = await db.user.update({ where: { id }, data: { isActive: active }, select: { login: true, nickname: true } });
    await writeAudit(admin, active ? "user_unblocked" : "user_blocked", { type: "user", id, label: user.nickname ?? user.login });
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
    const admin = await requireActionUser("ADMIN");
    const data = parse(groupSchema, formToObject(formData));
    await validateGroupRefs(data.subjectId, data.teacherId);
    const payload = { name: data.name, subjectId: data.subjectId, teacherId: data.teacherId, level: data.level };
    try {
      const group = data.id
        ? await db.group.update({ where: { id: data.id }, data: payload, select: { id: true } })
        : await db.group.create({ data: payload, select: { id: true } });
      await writeAudit(admin, data.id ? "group_updated" : "group_created", { type: "group", id: group.id, label: data.name });
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
    const admin = await requireActionUser("ADMIN");
    const { id: groupId } = parse(idOnlySchema, { id });
    const doomed = await db.group.findUnique({ where: { id: groupId }, select: { name: true } });
    await db.group.delete({ where: { id: groupId } });
    await writeAudit(admin, "group_deleted", { type: "group", id: groupId, label: doomed?.name ?? "" });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    return { ok: true, message: ru.admin.groupDeleted };
  });
}

export async function addStudentToGroup(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
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
    await writeAudit(admin, "member_added", { type: "membership", id: data.groupId, label: `${data.studentId}` });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    return { ok: true, message: ru.admin.studentAdded };
  });
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const data = parse(membershipSchema, { groupId, studentId });
    await db.groupStudent.delete({ where: { groupId_studentId: data } });
    await writeAudit(admin, "member_removed", { type: "membership", id: data.groupId, label: `${data.studentId}` });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    return { ok: true, message: ru.admin.studentRemoved };
  });
}

/* ---------------- Расписание ---------------- */

export async function createSlot(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const data = parse(slotSchema, formToObject(formData));
    const group = await db.group.findUnique({ where: { id: data.groupId }, select: { id: true } });
    if (!group) throw new ActionError(ru.errors.validation, { groupId: ru.errors.notFound });
    await db.scheduleSlot.create({ data });
    await writeAudit(admin, "slot_created", { type: "slot", id: data.groupId, label: `${data.dayOfWeek} ${data.startTime}` });
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
    const admin = await requireActionUser("ADMIN");
    const { id: slotId } = parse(idOnlySchema, { id });
    const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new ActionError(ru.errors.notFound);
    await db.$transaction(async (tx) => {
      await tx.scheduleSlot.delete({ where: { id: slot.id } });
      await writeAudit(admin, "slot_deleted", { type: "slot", id: slot.groupId, label: `${slot.dayOfWeek} ${slot.startTime}` });
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
    const admin = await requireActionUser("ADMIN");
    const groups = await db.group.findMany({ select: { id: true } });
    const now = today();
    const created = await ensureLessons(db, groups.map((g) => g.id), now, addDays(now, 13));
    await writeAudit(admin, "lessons_generated", { type: "system" }, { created });
    refreshAdmin();
    revalidatePath("/teacher", "layout");
    revalidatePath("/student", "layout");
    return { ok: true, message: ru.admin.lessonsGenerated(created) };
  });
}

/* ---------------- Предметы ---------------- */

export async function createSubject(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("ADMIN");
    const data = parse(subjectSchema, formToObject(formData));
    try {
      await db.subject.create({ data });
      await writeAudit(admin, "subject_created", { type: "subject", label: data.name });
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
    const admin = await requireActionUser("ADMIN");
    const { id } = parse(idOnlySchema, { id: formData.get("id") });
    const data = parse(subjectSchema, { name: formData.get("name") });
    try {
      await db.subject.update({ where: { id }, data });
      await writeAudit(admin, "subject_renamed", { type: "subject", id, label: data.name });
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
    const admin = await requireActionUser("ADMIN");
    const { id: subjectId } = parse(idOnlySchema, { id });
    const groups = await db.group.count({ where: { subjectId } });
    if (groups > 0) throw new ActionError(ru.errors.subjectInUse);
    const doomed = await db.subject.findUnique({ where: { id: subjectId }, select: { name: true } });
    await db.subject.delete({ where: { id: subjectId } });
    await writeAudit(admin, "subject_deleted", { type: "subject", id: subjectId, label: doomed?.name ?? "" });
    refreshAdmin();
    return { ok: true, message: ru.admin.subjectDeleted };
  });
}
