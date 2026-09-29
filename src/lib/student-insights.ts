/**
 * Всё, что нужно показать ученику о его рейтинге: ранг, динамика, график, места в группах,
 * подсказки и достижения. Формулы баллов — в lib/rating.ts, отбор данных по датам — в lib/rating-history.ts.
 */
import type { AttendanceStatus, HomeworkStatus } from "@prisma/client";
import { evaluateAchievements, type AchievementCode } from "@/lib/achievements";
import { db } from "@/lib/db";
import { today } from "@/lib/dates";
import { assignPlaces, placeOf, type Placed } from "@/lib/leaderboard";
import { PERSON_SELECT, type PersonLike } from "@/lib/person";
import { getStudentRatings } from "@/lib/rating-data";
import { inputAsOf, ratingAsOf, weeklyDelta, weeklySeries, type RatingRecords, type SeriesPoint } from "@/lib/rating-history";
import { ratingTips, type Tip } from "@/lib/rating-tips";
import { nextRank, pointsToNext, rankOf, rankProgress, type Rank } from "@/lib/ranks";
import type { StudentRating } from "@/lib/rating";

/** Все оценки, отметки и ДЗ ученика с датами (по всем группам или только по указанным). */
export async function loadRatingRecords(studentId: string, groupIds?: string[]): Promise<RatingRecords> {
  const groupFilter = groupIds ? { in: groupIds } : undefined;
  const memberships = await db.groupStudent.findMany({ where: { studentId, groupId: groupFilter }, select: { groupId: true } });
  const [grades, attendance, homework] = await Promise.all([
    db.grade.findMany({ where: { studentId, groupId: groupFilter }, orderBy: [{ date: "asc" }, { createdAt: "asc" }], select: { date: true, value: true } }),
    db.attendance.findMany({ where: { studentId, lesson: { groupId: groupFilter } }, select: { status: true, lesson: { select: { date: true } } } }),
    db.homework.findMany({
      where: { groupId: { in: memberships.map((m) => m.groupId) } },
      select: { dueDate: true, submissions: { where: { studentId }, select: { status: true } } },
    }),
  ]);
  return {
    grades,
    attendance: attendance.map((a) => ({ date: a.lesson.date, status: a.status as AttendanceStatus })),
    homework: homework.map((h) => ({ dueDate: h.dueDate, status: (h.submissions[0]?.status as HomeworkStatus | undefined) ?? null })),
  };
}

export interface GroupPlace {
  groupId: string;
  groupName: string;
  place: number;
  of: number;
}

/**
 * Место ученика в каждой его группе. Считается среди тех, кто виден в доске почёта, плюс сам ученик
 * (если он скрыт из доски, он видит своё место так, будто участвует).
 */
export async function getGroupPlaces(studentId: string, groupIds?: string[]): Promise<GroupPlace[]> {
  const groups = await db.groupStudent.findMany({
    where: { studentId, groupId: groupIds ? { in: groupIds } : undefined },
    orderBy: { group: { name: "asc" } },
    select: { group: { select: { id: true, name: true, students: { select: { studentId: true, student: { select: { showInLeaderboard: true } } } } } } },
  });
  const out: GroupPlace[] = [];
  for (const { group } of groups) {
    const ids = group.students.filter((s) => s.student.showInLeaderboard || s.studentId === studentId).map((s) => s.studentId);
    const ratings = await getStudentRatings(ids, { period: "all", groupIds: [group.id] });
    const place = placeOf([...ratings].map(([id, r]) => ({ id, total: r.total })), studentId);
    if (place) out.push({ groupId: group.id, groupName: group.name, ...place });
  }
  return out;
}

export interface StudentInsights {
  /** Рейтинг за всё время: от него считаются ранг, динамика и график */
  allTime: StudentRating;
  rank: Rank;
  nextRank: Rank | null;
  pointsToNext: number | null;
  rankProgress: number;
  weeklyDelta: number | null;
  series: SeriesPoint[];
  tips: Tip[];
  places: GroupPlace[];
  records: RatingRecords;
}

/** groupIds ограничивает данные группами (учитель видит ученика только по своим группам). */
export async function getStudentInsights(studentId: string, groupIds?: string[]): Promise<StudentInsights> {
  const now = today();
  const records = await loadRatingRecords(studentId, groupIds);
  const allTime = ratingAsOf(records, now, { includeFutureMarked: true });
  const total = allTime.total;
  return {
    allTime,
    rank: rankOf(total),
    nextRank: nextRank(total),
    pointsToNext: pointsToNext(total),
    rankProgress: rankProgress(total),
    weeklyDelta: weeklyDelta(records, now),
    series: weeklySeries(records, now, 8),
    tips: ratingTips(inputAsOf(records, now, { includeFutureMarked: true })),
    places: await getGroupPlaces(studentId, groupIds),
    records,
  };
}

export interface LeaderboardRow {
  studentId: string;
  person: PersonLike;
  total: number;
  place: number;
  rank: Rank;
}

/**
 * Доска почёта группы: топ-10 по баллам за всё время. В неё попадают только ученики, которые
 * не скрыли себя в профиле, и только те, у кого есть данные.
 */
export async function getGroupLeaderboard(groupId: string, limit = 10): Promise<{ rows: LeaderboardRow[]; visibleCount: number }> {
  const members = await db.groupStudent.findMany({
    where: { groupId, student: { showInLeaderboard: true, user: { isActive: true } } },
    select: { studentId: true, student: { select: { user: { select: PERSON_SELECT } } } },
  });
  const ratings = await getStudentRatings(members.map((m) => m.studentId), { period: "all", groupIds: [groupId] });
  const byId = new Map(members.map((m) => [m.studentId, m.student.user]));
  const placed: Placed<{ id: string; total: number | null }>[] = assignPlaces([...ratings].map(([id, r]) => ({ id, total: r.total })));
  return {
    visibleCount: placed.length,
    rows: placed.slice(0, limit).map((p) => ({
      studentId: p.item.id,
      person: byId.get(p.item.id)!,
      total: p.item.total!,
      place: p.place,
      rank: rankOf(p.item.total),
    })),
  };
}

/**
 * Выдаёт заслуженные достижения (новые записываются как «не просмотрены» — из-за них покажется конфетти).
 * Достижения не отбираются: раз выданное остаётся. Ошибка не должна ломать основное действие.
 */
export async function syncAchievements(studentId: string): Promise<AchievementCode[]> {
  try {
    const now = today();
    const records = await loadRatingRecords(studentId);
    const places = await getGroupPlaces(studentId);
    const earned = evaluateAchievements({
      today: now,
      grades: records.grades,
      attendance: records.attendance,
      homework: records.homework,
      bestPlace: places.length ? Math.min(...places.map((p) => p.place)) : null,
      weeklyDelta: weeklyDelta(records, now),
    });
    const have = new Set((await db.studentAchievement.findMany({ where: { studentId }, select: { code: true } })).map((a) => a.code));
    const fresh = earned.filter((c) => !have.has(c));
    for (const code of fresh) {
      try {
        await db.studentAchievement.create({ data: { studentId, code } });
      } catch (error) {
        // Параллельная выдача того же достижения — нормально
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
    }
    return fresh;
  } catch (error) {
    console.error("Не удалось обновить достижения", error);
    return [];
  }
}
