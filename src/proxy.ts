import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROLE_HOME, requiredRoleForPath } from "@/lib/roles";

/**
 * Первая линия защиты: без сессии — на /login (API — 401),
 * раздел чужой роли — 403. Детальные проверки владения данными
 * выполняются на сервере в каждой странице, server action и API route.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/login") return NextResponse.next();

  if (!user?.role) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = new URL("/login", req.nextUrl);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/") return NextResponse.redirect(new URL(ROLE_HOME[user.role], req.nextUrl));

  const required = requiredRoleForPath(pathname);
  if (required && required !== user.role) {
    if (isApi) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.rewrite(new URL("/forbidden", req.nextUrl), { status: 403 });
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp|jpg)$).*)"],
};
