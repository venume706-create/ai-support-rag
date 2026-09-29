"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, House, ScrollText, Star, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavIcon, NavItem } from "./nav-config";

const ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  home: House,
  teachers: GraduationCap,
  students: UserRound,
  groups: UsersRound,
  schedule: CalendarDays,
  grades: Star,
  attendance: ClipboardCheck,
  homework: BookOpenCheck,
  journal: ScrollText,
};

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const root = items[0]?.href ?? "/";
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href, root);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-bold text-on-wood-muted transition-colors hover:bg-black/20 hover:text-on-wood",
              active && "brass brass-plate py-2.5 text-[#2b1d14] hover:bg-transparent hover:text-[#2b1d14]",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const root = items[0]?.href ?? "/";
  return (
    <nav
      className="leather fixed inset-x-0 bottom-0 z-40 border-t-2 border-dashed border-stitch/60 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden"
      aria-label="mobile"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href, root);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold text-on-wood-muted",
                  active && "text-brass-light",
                )}
              >
                <span className={cn("flex h-7 w-11 items-center justify-center rounded-full", active && "brass text-[#2b1d14]")}>
                  <Icon className="size-5" />
                </span>
                <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
