import type { AttendanceStatus, HomeworkStatus } from "@prisma/client";
import { addDays } from "@/lib/dates";
import { db } from "@/lib/db";
import { weeklyAttendanceSeries } from "@/lib/trends";
import { PERSON_SELECT, type PersonLike } from "@/lib/person";
import { startOfMonth, startOfNextMonth, today } from "@/lib/dates";
import {
  calculateStudentRating,
  calculateTeacherAggregates,
  calculateTeacherRating,
  type RatingInput,
  type StudentRating,
} from "@/lib/rating";

export type RatingPeriod = "month" | "all";

interface RatingScope {
  period: RatingPeriod;
  /** Ограничить расчёт этими группами (например, группами учителя) */
  groupIds?: string[];
}

function periodRange(period: RatingPeriod) {
  if (period === "all") return null;
  const now = today();
  return { gte: startOfMonth(now), lt: startOfNextMonth(now) };
}

/**
 * Загружает данные для расчёта рейтинга сразу для многих учеников.
 * ДЗ: учитываются задания групп ученика со сроком до сегодняшнего дня
 * (без отметки = «не выполнено»), а также уже отмеченные задания с будущим сроком.
 */
export async function loadRatingInputs(studentIds: string[], scope: RatingScope): Promise<Map<string, RatingInput>> {
  const result = new Map<string, RatingInput>(studentIds.map((id) => [id, { grades: [], attendance: [], homework: [] }]));
  if (studentIds.length === 0) return result;
  const range = periodRange(scope.period);
  const groupFilter = scope.groupIds ? { in: scope.groupIds } : undefined;

  const [grades, attendance, memberships] = await Promise.all([
    db.grade.findMany({
      where: { studentId: { in: studentIds }, groupId: groupFilter, date: range ?? undefined },
      select: { studentId: true, value: true },
    }),
    db.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        lesson: { groupId: groupFilter, date: range ?? undefined },
      },
      select: { studentId: true, status: true },
    }),
    db.groupStudent.findMany({
      where: { studentId: { in: studentIds }, groupId: groupFilter },
      select: { studentId: true, groupId: true },
    }),
  ]);

  for (const g of grades) result.get(g.studentId)!.grades.push(g.value);
  for (const a of attendance) result.get(a.studentId)!.attendance.push(a.status as AttendanceStatus);

  const groupIds = [...new Set(memberships.map((m) => m.groupId))];
  if (groupIds.length) {
    const now = today();
    const homework = await db.homework.findMany({
      where: { groupId: { in: groupIds }, dueDate: range ?? undefined },
      select: {
        id: true,
        groupId: true,
        dueDate: true,
        submissions: { where: { studentId: { in: studentIds } }, select: { studentId: true, status: true } },
      },
    });
    const membersByGroup = new Map<string, string[]>();
    for (const m of memberships) membersByGroup.set(m.groupId, [...(membersByGroup.get(m.groupId) ?? []), m.studentId]);
    for (const hw of homework) {
      const statusByStudent = new Map(hw.submissions.map((s) => [s.studentId, s.status as HomeworkStatus]));
      for (const studentId of membersByGroup.get(hw.groupId) ?? []) {
        const status = statusByStudent.get(studentId);
        if (status) result.get(studentId)!.homework.push(status);
        else if (hw.dueDate < now) result.get(studentId)!.homework.push("NOT_DONE");
      }
    }
  }
  return result;
}

export async function getStudentRatings(studentIds: string[], scope: RatingScope): Promise<Map<string, StudentRating>> {
  const inputs = await loadRatingInputs(studentIds, scope);
  return new Map([...inputs].map(([id, input]) => [id, calculateStudentRating(input)]));
}

export async function getStudentRating(studentId: string, scope: RatingScope): Promise<StudentRating> {
  return (await getStudentRatings([studentId], scope)).get(studentId)!;
}

export interface TeacherRatingRow {
  teacherId: string;
  person: PersonLike;
  isActive: boolean;
  groups: number;
  students: number;
  rating: number | null;
  studentsCounted: number;
  /** Посещаемость всех учеников его групп, % (null — данных нет) */
  attendancePercent: number | null;
  /** Доля сданных ДЗ в его группах, % (null — данных нет) */
  homeworkPercent: number | null;
}

/** Рейтинг учителей: средний рейтинг учеников, посчитанный по группам этого учителя. */
export async function getTeacherRatings(period: RatingPeriod, teacherIds?: string[]): Promise<TeacherRatingRow[]> {
  const teachers = await db.teacher.findMany({
    where: teacherIds ? { id: { in: teacherIds } } : undefined,
    select: {
      id: true,
      user: { select: { ...PERSON_SELECT, isActive: true } },
      groups: { select: { id: true, students: { select: { studentId: true } } } },
    },
  });
  const rows: TeacherRatingRow[] = [];
  for (const t of teachers) {
    const groupIds = t.groups.map((g) => g.id);
    const studentIds = [...new Set(t.groups.flatMap((g) => g.students.map((s) => s.studentId)))];
    const inputs = await loadRatingInputs(studentIds, { period, groupIds });
    const { rating, studentsCounted } = calculateTeacherRating([...inputs.values()].map((i) => calculateStudentRating(i).total));
    const { attendancePercent, homeworkPercent } = calculateTeacherAggregates([...inputs.values()]);
    rows.push({
      teacherId: t.id,
      person: t.user,
      isActive: t.user.isActive,
      groups: groupIds.length,
      students: studentIds.length,
      rating,
      studentsCounted,
      attendancePercent,
      homeworkPercent,
    });
  }
  return rows.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
}

/** Средняя посещаемость (в процентах) по отметкам за текущий месяц. */
export async function monthAttendancePercent(groupIds?: string[]): Promise<number | null> {
  const range = periodRange("month")!;
  const rows = await db.attendance.groupBy({
    by: ["status"],
    where: { lesson: { date: range, groupId: groupIds ? { in: groupIds } : undefined } },
    _count: { _all: true },
  });
  const count = (s: AttendanceStatus) => rows.find((r) => r.status === s)?._count._all ?? 0;
  const counted = count("PRESENT") + count("LATE") + count("ABSENT");
  if (counted === 0) return null;
  return Math.round(((count("PRESENT") + count("LATE") * 0.5) / counted) * 1000) / 10;
}

/** Посещаемость по неделям за последние 8 недель (по всем группам или по указанным). */
export async function getWeeklyAttendance(groupIds?: string[]) {
  const now = today();
  const rows = await db.attendance.findMany({
    where: { lesson: { date: { gt: addDays(now, -56), lte: now }, groupId: groupIds ? { in: groupIds } : undefined } },
    select: { status: true, lesson: { select: { date: true } } },
  });
  return weeklyAttendanceSeries(rows.map((r) => ({ date: r.lesson.date, status: r.status as AttendanceStatus })), now, 8);
}

export interface GroupRatingRow {
  id: string;
  name: string;
  students: number;
  rating: number | null;
}

/** Средний рейтинг учеников каждой группы (за всё время), лучшие сверху. */
export async function getGroupRatings(groupIds?: string[]): Promise<GroupRatingRow[]> {
  const groups = await db.group.findMany({
    where: groupIds ? { id: { in: groupIds } } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, students: { select: { studentId: true } } },
  });
  const rows: GroupRatingRow[] = [];
  for (const g of groups) {
    const ratings = await getStudentRatings(g.students.map((s) => s.studentId), { period: "all", groupIds: [g.id] });
    rows.push({ id: g.id, name: g.name, students: g.students.length, rating: calculateTeacherRating([...ratings.values()].map((r) => r.total)).rating });
  }
  return rows.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
}
