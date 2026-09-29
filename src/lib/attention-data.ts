import type { AttendanceMark, HomeworkMark } from "@/lib/rating";
import { attentionReasons, type AttentionReason } from "@/lib/attention";
import { today } from "@/lib/dates";
import { db } from "@/lib/db";
import { PERSON_SELECT, type PersonLike } from "@/lib/person";
import { getStudentRatings } from "@/lib/rating-data";

export interface AttentionRow {
  studentId: string;
  person: PersonLike;
  groups: string[];
  rating: number | null;
  reasons: AttentionReason[];
}

/**
 * Ученики указанных групп, которым нужно внимание учителя (см. lib/attention.ts).
 * Сначала те, у кого больше причин, затем с меньшим рейтингом.
 */
export async function getAttentionList(groupIds: string[], limit = 8): Promise<AttentionRow[]> {
  if (groupIds.length === 0) return [];
  const now = today();
  const members = await db.groupStudent.findMany({
    where: { groupId: { in: groupIds } },
    select: { groupId: true, group: { select: { name: true } }, student: { select: { id: true, user: { select: PERSON_SELECT } } } },
  });
  const studentIds = [...new Set(members.map((m) => m.student.id))];
  if (studentIds.length === 0) return [];

  const [ratings, attendance, grades, homework] = await Promise.all([
    getStudentRatings(studentIds, { period: "all", groupIds }),
    db.attendance.findMany({
      where: { studentId: { in: studentIds }, lesson: { groupId: { in: groupIds }, date: { lte: now } } },
      orderBy: [{ lesson: { date: "desc" } }, { lesson: { startTime: "desc" } }],
      select: { studentId: true, status: true },
    }),
    db.grade.findMany({
      where: { studentId: { in: studentIds }, groupId: { in: groupIds } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { studentId: true, value: true },
    }),
    db.homework.findMany({
      where: { groupId: { in: groupIds }, dueDate: { lt: now } },
      orderBy: { dueDate: "desc" },
      take: 60,
      select: { groupId: true, submissions: { where: { studentId: { in: studentIds } }, select: { studentId: true, status: true } } },
    }),
  ]);

  const byStudent = <T extends { studentId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) map.set(r.studentId, [...(map.get(r.studentId) ?? []), r]);
    return map;
  };
  const att = byStudent(attendance);
  const gr = byStudent(grades);
  const groupsOf = new Map<string, string[]>();
  const groupIdsOf = new Map<string, Set<string>>();
  for (const m of members) {
    groupsOf.set(m.student.id, [...(groupsOf.get(m.student.id) ?? []), m.group.name]);
    groupIdsOf.set(m.student.id, (groupIdsOf.get(m.student.id) ?? new Set()).add(m.groupId));
  }

  const rows: AttentionRow[] = [];
  for (const m of new Map(members.map((x) => [x.student.id, x])).values()) {
    const id = m.student.id;
    // Задание без отметки после срока = «не выполнено» (как в рейтинге)
    const hw: HomeworkMark[] = homework
      .filter((h) => groupIdsOf.get(id)?.has(h.groupId))
      .map((h) => (h.submissions.find((s) => s.studentId === id)?.status ?? "NOT_DONE") as HomeworkMark);
    const rating = ratings.get(id)?.total ?? null;
    const reasons = attentionReasons({
      rating,
      attendance: (att.get(id) ?? []).map((a) => a.status as AttendanceMark),
      homework: hw,
      grades: (gr.get(id) ?? []).map((g) => g.value),
    });
    if (reasons.length) rows.push({ studentId: id, person: m.student.user, groups: groupsOf.get(id) ?? [], rating, reasons });
  }
  rows.sort((a, b) => b.reasons.length - a.reasons.length || (a.rating ?? 100) - (b.rating ?? 100));
  return rows.slice(0, limit);
}
