"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/security";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

export interface BellItem {
  id: string;
  title: string;
  body: string;
  link: string;
  when: string;
  unread: boolean;
}

export function BellMenu({ unread, items, variant = "icon" }: { unread: number; items: BellItem[]; variant?: "icon" | "row" }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = ru.security;

  function markRead() {
    start(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t.bellLabel(unread)}
          data-testid="bell"
          data-unread={unread}
          className={cn(
            "relative flex items-center rounded-md hover:bg-black/20",
            variant === "row" ? "h-11 w-full gap-3 px-3 text-sm font-bold hover:text-on-wood" : "size-11 justify-center",
          )}
        >
          <Bell className="size-4" />
          {variant === "row" && <span>{t.bellTitle}</span>}
          {unread > 0 && (
            <span
              data-testid="bell-count"
              className={cn(
                "flex min-w-5 items-center justify-center rounded-full bg-ink-red px-1 text-[11px] leading-5 font-bold text-white",
                variant === "row" ? "ml-auto" : "absolute top-1 right-1",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent closeLabel={ru.common.close}>
        <DialogHeader>
          <DialogTitle>{t.bellTitle}</DialogTitle>
          <DialogDescription>{items.length === 0 ? t.bellEmpty : t.description}</DialogDescription>
        </DialogHeader>
        {items.length > 0 && (
          <ul className="grid max-h-[50dvh] gap-2 overflow-y-auto" data-testid="bell-list">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link || "/admin/security"}
                  onClick={() => setOpen(false)}
                  data-unread={n.unread}
                  className={cn("block rounded-md p-3 hover:bg-black/10 dark:hover:bg-white/10", n.unread ? "bg-ink-red/10" : "bg-black/[0.04] dark:bg-white/[0.05]")}
                >
                  <p className="font-bold">{n.title}</p>
                  {n.body && <p className="text-sm">{n.body}</p>}
                  <p className="text-xs text-muted-foreground tabular-nums">{n.when}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/security" onClick={() => setOpen(false)}>
              {t.bellOpenPage}
            </Link>
          </Button>
          {unread > 0 && (
            <Button variant="outline" onClick={markRead} disabled={pending} data-testid="bell-mark-read">
              {t.bellMarkRead}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
