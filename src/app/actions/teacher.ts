"use server";

import { revalidatePath } from "next/cache";
import { parse } from "@/lib/action-utils";
import {
  ActionError,
  assertGroupAction,
  requireActionUser,
  runAction,
  type ActionResult,
  type CurrentUser,
} from "@/lib/access";
import { parseDateOnly, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import {
  attendanceBulkSchema,
  attendanceSchema,
  gradeSchema,
  homeworkSchema,
  idOnlySchema,
  lessonTopicSchema,
  submissionSchema,
} from "@/lib/validation";

type State = ActionResult<unknown> | null;

/** Урок существует, доступен пользователю и уже начался (будущие уроки не отмечаются). */
async function loadLesson(user: CurrentUser, lessonId: string, requirePast = true) {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true, groupId: true, date: true } });
  if (!lesson) throw new ActionError(ru.errors.notFound);
  await assertGroupAction(user, lesson.groupId);
  if (requirePast && lesson.date > today()) throw new ActionError(ru.errors.futureLesson);
  return lesson;
}

async function assertMember(groupId: string, studentId: string) {
  const link = await db.groupStudent.findUnique({ where: { groupId_studentId: { groupId, studentId } }, select: { id: true } });
  if (!link) throw new ActionError(ru.errors.studentNotInGroup);
}

function refresh(groupId: string) {
  revalidatePath(`/teacher/groups/${groupId}`);
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/admin", "layout");
}

/* ---------------- Посещаемость ---------------- */

export async function saveAttendance(input: { lessonId: string; studentId: string; status: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const data = parse(attendanceSchema, input);
    const lesson = await loadLesson(user, data.lessonId);
    await assertMember(lesson.groupId, data.studentId);
    await db.attendance.upsert({
      where: { lessonId_studentId: { lessonId: data.lessonId, studentId: data.studentId } },
      update: { status: data.status },
      create: data,
    });
    refresh(lesson.groupId);
    return { ok: true };
  });
}

export async function markAllAttendance(input: { lessonId: string; status: string }): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const data = parse(attendanceBulkSchema, input);
    const lesson = await loadLesson(user, data.lessonId);
    const members = await db.groupStudent.findMany({ where: { groupId: lesson.groupId }, select: { studentId: true } });
    await db.$transaction(
      members.map((m) =>
        db.attendance.upsert({
          where: { lessonId_studentId: { lessonId: lesson.id, studentId: m.studentId } },
          update: { status: data.status },
          create: { lessonId: lesson.id, studentId: m.studentId, status: data.status },
        }),
      ),
    );
    refresh(lesson.groupId);
    return { ok: true, message: ru.common.saved, data: { count: members.length } };
  });
}

/* ---------------- Оценки ---------------- */

export async function addGrade(input: { lessonId: string; studentId: string; value: number; comment?: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const data = parse(gradeSchema, input);
    const lesson = await loadLesson(user, data.lessonId);
    await assertMember(lesson.groupId, data.studentId);
    const grade = await db.grade.create({
      data: {
        studentId: data.studentId,
        groupId: lesson.groupId,
        lessonId: lesson.id,
        date: lesson.date,
        value: data.value,
        comment: data.comment,
      },
      select: { id: true },
    });
    refresh(lesson.groupId);
    return { ok: true, message: ru.teacher.gradeSaved, data: { id: grade.id } };
  });
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const { id: gradeId } = parse(idOnlySchema, { id });
    const grade = await db.grade.findUnique({ where: { id: gradeId }, select: { id: true, groupId: true } });
    if (!grade) throw new ActionError(ru.errors.notFound);
    await assertGroupAction(user, grade.groupId);
    await db.grade.delete({ where: { id: grade.id } });
    refresh(grade.groupId);
    return { ok: true, message: ru.teacher.gradeDeleted };
  });
}

/* ---------------- Тема урока ---------------- */

export async function saveLessonTopic(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const data = parse(lessonTopicSchema, { lessonId: formData.get("lessonId"), topic: formData.get("topic") ?? "" });
    const lesson = await loadLesson(user, data.lessonId, false);
    await db.lesson.update({ where: { id: lesson.id }, data: { topic: data.topic } });
    refresh(lesson.groupId);
    return { ok: true, message: ru.teacher.topicSaved };
  });
}

/* ---------------- Домашние задания ---------------- */

export async function saveHomework(_prev: State, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const data = parse(homeworkSchema, {
      id: formData.get("id") || undefined,
      groupId: formData.get("groupId"),
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      dueDate: formData.get("dueDate"),
    });
    await assertGroupAction(user, data.groupId);
    const payload = { title: data.title, description: data.description, dueDate: parseDateOnly(data.dueDate) };
    if (data.id) {
      const existing = await db.homework.findUnique({ where: { id: data.id }, select: { groupId: true } });
      if (!existing) throw new ActionError(ru.errors.notFound);
      // Задание нельзя «перенести» в чужую группу подменой groupId
      await assertGroupAction(user, existing.groupId);
      if (existing.groupId !== data.groupId) throw new ActionError(ru.errors.forbidden);
      await db.homework.update({ where: { id: data.id }, data: payload });
    } else {
      await db.homework.create({ data: { ...payload, groupId: data.groupId } });
    }
    refresh(data.groupId);
    return { ok: true, message: data.id ? ru.teacher.homeworkUpdated : ru.teacher.homeworkCreated };
  });
}

export async function deleteHomework(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const { id: homeworkId } = parse(idOnlySchema, { id });
    const homework = await db.homework.findUnique({ where: { id: homeworkId }, select: { id: true, groupId: true } });
    if (!homework) throw new ActionError(ru.errors.notFound);
    await assertGroupAction(user, homework.groupId);
    await db.homework.delete({ where: { id: homework.id } });
    refresh(homework.groupId);
    return { ok: true, message: ru.teacher.homeworkDeleted };
  });
}

export async function saveSubmission(input: { homeworkId: string; studentId: string; status: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("TEACHER", "ADMIN");
    const data = parse(submissionSchema, input);
    const homework = await db.homework.findUnique({ where: { id: data.homeworkId }, select: { groupId: true } });
    if (!homework) throw new ActionError(ru.errors.notFound);
    await assertGroupAction(user, homework.groupId);
    await assertMember(homework.groupId, data.studentId);
    await db.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId: data.homeworkId, studentId: data.studentId } },
      update: { status: data.status },
      create: data,
    });
    refresh(homework.groupId);
    return { ok: true };
  });
}
