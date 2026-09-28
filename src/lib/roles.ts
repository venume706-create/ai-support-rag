import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

/** Какой роли принадлежит раздел по префиксу пути (страницы и API). */
export function requiredRoleForPath(pathname: string): Role | null {
  if (/^\/(api\/)?admin(\/|$)/.test(pathname)) return "ADMIN";
  if (/^\/(api\/)?teacher(\/|$)/.test(pathname)) return "TEACHER";
  if (/^\/(api\/)?student(\/|$)/.test(pathname)) return "STUDENT";
  return null;
}
