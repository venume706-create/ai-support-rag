"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenCheck, CalendarDays, ClipboardCheck, Ellipsis, GraduationCap, House, ScrollText, ShieldAlert, Star, UserRound, UsersRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";
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
  security: ShieldAlert,
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

/** Сколько пунктов помещается в нижней панели на узком телефоне; остальные — в «Ещё». */
const BOTTOM_MAX = 5;

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const root = items[0]?.href ?? "/";
  const overflow = items.length > BOTTOM_MAX;
  const shown = overflow ? items.slice(0, BOTTOM_MAX - 1) : items;
  const hidden = overflow ? items.slice(BOTTOM_MAX - 1) : [];
  const hiddenActive = hidden.some((item) => isActive(pathname, item.href, root));
  const cell = "flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-bold text-on-wood-muted";
  const columns = shown.length + (overflow ? 1 : 0);
  return (
    <nav
      className="leather fixed inset-x-0 bottom-0 z-40 border-t-2 border-dashed border-stitch/60 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden"
      aria-label="mobile"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {shown.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href, root);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(cell, active && "text-brass-light")}>
                <span className={cn("flex h-7 w-11 items-center justify-center rounded-full", active && "brass text-[#2b1d14]")}>
                  <Icon className="size-5" />
                </span>
                <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
        {overflow && (
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} data-testid="nav-more" aria-haspopup="dialog" className={cn(cell, hiddenActive && "text-brass-light")}>
              <span className={cn("flex h-7 w-11 items-center justify-center rounded-full", hiddenActive && "brass text-[#2b1d14]")}>
                <Ellipsis className="size-5" />
              </span>
              <span className="max-w-full truncate px-1">{ru.nav.more}</span>
            </button>
          </li>
        )}
      </ul>
      {overflow && (
        <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
          <DialogContent closeLabel={ru.common.close}>
            <DialogHeader>
              <DialogTitle>{ru.nav.more}</DialogTitle>
            </DialogHeader>
            <ul className="grid gap-1" data-testid="nav-more-list">
              {hidden.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item.href, root);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex min-h-12 items-center gap-3 rounded-md px-3 text-base font-bold hover:bg-black/10 dark:hover:bg-white/10", active && "bg-black/10 dark:bg-white/10")}
                    >
                      <Icon className="size-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </nav>
  );
}
