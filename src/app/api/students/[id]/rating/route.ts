import { NextResponse } from "next/server";
import { apiForbidden, apiNotFound, apiUser, canAccessStudent } from "@/lib/access";
import { db } from "@/lib/db";
import { nickOf } from "@/lib/person";
import { getStudentRating } from "@/lib/rating-data";

/** Рейтинг ученика. Админ — любого, учитель — только своих учеников (по своим группам), ученик — только свой. */
export async function GET(req: Request, ctx: RouteContext<"/api/students/[id]/rating">) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const student = await db.student.findUnique({ where: { id }, select: { id: true, user: { select: { nickname: true, login: true, fullName: true } } } });
  if (!student) return apiNotFound();
  if (!(await canAccessStudent(user, id))) return apiForbidden();

  const period = new URL(req.url).searchParams.get("period") === "month" ? "month" : "all";
  let groupIds: string[] | undefined;
  if (user.role === "TEACHER") {
    const groups = await db.group.findMany({ where: { teacherId: user.teacherId }, select: { id: true } });
    groupIds = groups.map((g) => g.id);
  }
  const rating = await getStudentRating(id, { period, groupIds });
  return NextResponse.json({ studentId: id, nickname: nickOf(student.user), fullName: student.user.fullName, period, rating });
}
