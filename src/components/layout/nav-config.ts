import type { Role } from "@prisma/client";
import { ru } from "@/lib/i18n/ru";

export type NavIcon = "home" | "teachers" | "students" | "groups" | "schedule" | "grades" | "attendance" | "homework" | "journal" | "security";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: NavIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: ru.nav.dashboard, icon: "home" },
    { href: "/admin/teachers", label: ru.nav.teachers, icon: "teachers" },
    { href: "/admin/students", label: ru.nav.students, icon: "students" },
    { href: "/admin/groups", label: ru.nav.groups, icon: "groups" },
    { href: "/admin/schedule", label: ru.nav.schedule, icon: "schedule" },
    { href: "/admin/journal", label: ru.nav.journal, icon: "journal" },
    { href: "/admin/security", label: ru.nav.security, icon: "security" },
  ],
  TEACHER: [
    { href: "/teacher", label: ru.nav.dashboard, icon: "home" },
    { href: "/teacher/groups", label: ru.nav.myGroups, shortLabel: ru.nav.groups, icon: "groups" },
    { href: "/teacher/schedule", label: ru.nav.schedule, icon: "schedule" },
  ],
  STUDENT: [
    { href: "/student", label: ru.nav.dashboard, icon: "home" },
    { href: "/student/grades", label: ru.nav.grades, icon: "grades" },
    { href: "/student/attendance", label: ru.nav.attendance, shortLabel: ru.nav.attendanceShort, icon: "attendance" },
    { href: "/student/homework", label: ru.nav.homeworkFull, shortLabel: ru.nav.homework, icon: "homework" },
    { href: "/student/schedule", label: ru.nav.schedule, icon: "schedule" },
  ],
};
