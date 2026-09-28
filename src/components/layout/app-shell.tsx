import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { CurrentUser } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { ROLE_HOME } from "@/lib/roles";
import { NAV } from "./nav-config";
import { BottomNav, SidebarNav } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./user-menu";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const items = NAV[user.role];
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar md:flex">
        <Link href={ROLE_HOME[user.role]} className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          {ru.app.name}
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} />
        </div>
        <div className="border-t p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" data-testid="current-user">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{ru.roles[user.role]}</p>
            </div>
            <ThemeToggle />
          </div>
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href={ROLE_HOME[user.role]} className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="truncate">{ru.app.name}</span>
        </Link>
        <div className="flex items-center">
          <ThemeToggle />
          <LogoutButton compact />
        </div>
      </header>

      <main className="px-4 pt-4 pb-24 md:ml-64 md:px-8 md:pt-8 md:pb-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <BottomNav items={items} />
    </div>
  );
}
