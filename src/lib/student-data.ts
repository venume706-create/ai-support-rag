import { db } from "@/lib/db";

/** Группы ученика (для фильтров и расписания). */
export async function studentGroups(studentId: string | null) {
  if (!studentId) return [];
  const links = await db.groupStudent.findMany({
    where: { studentId },
    orderBy: { group: { name: "asc" } },
    select: { group: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } } },
  });
  return links.map((l) => l.group);
}
