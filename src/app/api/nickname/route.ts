import { NextResponse } from "next/server";
import { apiSession } from "@/lib/access";
import { nicknameStatus } from "@/lib/nickname";

/** Проверка ника «на лету»: GET /api/nickname?nick=... → { available, reason?, own? }. */
export async function GET(req: Request) {
  const user = await apiSession();
  if (user instanceof NextResponse) return user;
  const nick = new URL(req.url).searchParams.get("nick") ?? "";
  // Для администратора при правке чужого профиля можно передать userId — свой ник этого человека считается свободным
  const forUser = new URL(req.url).searchParams.get("userId");
  const except = forUser && user.role === "ADMIN" ? forUser : user.id;
  return NextResponse.json(await nicknameStatus(nick.slice(0, 64), except), { headers: { "Cache-Control": "no-store" } });
}
