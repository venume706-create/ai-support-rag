import { db } from "@/lib/db";

/** Группы учителя (id), для ограничения данных его учениками и группами. */
export async function teacherGroupIds(teacherId: string | null): Promise<string[]> {
  if (!teacherId) return [];
  const groups = await db.group.findMany({ where: { teacherId }, select: { id: true } });
  return groups.map((g) => g.id);
}
