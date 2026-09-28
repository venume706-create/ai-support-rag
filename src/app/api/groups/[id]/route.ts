import { NextResponse } from "next/server";
import { apiForbidden, apiNotFound, apiUser, canAccessGroup } from "@/lib/access";
import { db } from "@/lib/db";

/** Состав группы. Админ — любая, учитель — только свои группы, ученик — только группы, где он учится. */
export async function GET(_req: Request, ctx: RouteContext<"/api/groups/[id]">) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      level: true,
      subject: { select: { name: true } },
      teacher: { select: { user: { select: { fullName: true } } } },
      students: { select: { student: { select: { id: true, user: { select: { fullName: true } } } } } },
    },
  });
  if (!group) return apiNotFound();
  if (!(await canAccessGroup(user, id))) return apiForbidden();
  return NextResponse.json({
    id: group.id,
    name: group.name,
    level: group.level,
    subject: group.subject.name,
    teacher: group.teacher?.user.fullName ?? null,
    // Ученику не показываем состав группы — только сведения о группе
    students:
      user.role === "STUDENT" ? undefined : group.students.map((s) => ({ id: s.student.id, fullName: s.student.user.fullName })),
  });
}
