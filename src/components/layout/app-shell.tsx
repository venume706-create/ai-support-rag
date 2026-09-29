import Link from "next/link";
import { GraduationCap, UserCog } from "lucide-react";
import type { CurrentUser } from "@/lib/access";
import { Avatar } from "@/components/common/avatar";
import { PersonName } from "@/components/common/person-name";
import { ru } from "@/lib/i18n/ru";
import { ROLE_HOME } from "@/lib/roles";
import { NAV } from "./nav-config";
import { BottomNav, SidebarNav } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./user-menu";

function Emblem({ small = false }: { small?: boolean }) {
  return (
    <span className={`brass flex shrink-0 items-center justify-center rounded-full ${small ? "size-8" : "size-10"}`}>
      <GraduationCap className={small ? "size-4" : "size-5"} />
    </span>
  );
}

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const items = NAV[user.role];
  return (
    <div className="min-h-dvh">
      {/* Сайдбар — кожаная обложка с прострочкой */}
      <aside className="leather stitched fixed inset-y-0 left-0 z-30 hidden w-64 flex-col md:flex">
        <Link href={ROLE_HOME[user.role]} className="relative z-10 flex h-20 items-center gap-3 px-6">
          <Emblem />
          <span className="font-serif text-lg leading-tight font-bold text-on-wood">{ru.app.name}</span>
        </Link>
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2">
          <SidebarNav items={items} />
        </div>
        <div className="relative z-10 border-t border-dashed border-stitch/40 px-4 pt-3 pb-5">
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <Link href="/profile" className="flex min-w-0 items-center gap-3 rounded-md py-1 hover:opacity-90" aria-label={ru.profile.title}>
              <Avatar user={user} size="md" />
              <span className="min-w-0" data-testid="current-user">
                <PersonName user={user} nickClassName="text-base text-on-wood" hideRealName />
                <span className="block truncate text-xs text-on-wood-muted">{user.firstName} {user.lastName}</span>
                <span className="block text-[11px] text-on-wood-muted/80">{ru.roles[user.role]}</span>
              </span>
            </Link>
            <div className="text-on-wood">
              <ThemeToggle />
            </div>
          </div>
          <div className="grid text-on-wood-muted">
            <Link
              href="/profile"
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-bold hover:bg-black/20 hover:text-on-wood"
              data-testid="account-link"
            >
              <UserCog className="size-4" />
              {ru.account.link}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <header className="leather sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b-2 border-dashed border-stitch/60 px-4 md:hidden">
        <Link href={ROLE_HOME[user.role]} className="flex min-w-0 items-center gap-2">
          <Emblem small />
          <span className="truncate font-serif font-bold text-on-wood">{ru.app.name}</span>
        </Link>
        <div className="flex items-center text-on-wood">
          <ThemeToggle />
          <Link href="/profile" aria-label={ru.account.link} className="flex size-11 items-center justify-center rounded-md hover:bg-black/20" data-testid="account-link">
            <Avatar user={user} size="xs" />
          </Link>
          <LogoutButton compact />
        </div>
      </header>

      <main className="px-4 pt-5 pb-28 md:ml-64 md:px-8 md:pt-8 md:pb-10">
        <div className="settle mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <BottomNav items={items} />
    </div>
  );
}
