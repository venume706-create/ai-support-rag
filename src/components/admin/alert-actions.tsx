"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, LockOpen, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { resolveSecurityAlert, unblockFromAlert } from "@/app/actions/security";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";

type Resolution = "OK" | "PASSWORD_RESET" | "BLOCKED";

/** Кнопки решения по тревоге: всё в порядке / сбросить пароль / заблокировать (вручную) / разблокировать. */
export function AlertActions({ alertId, nick, open, blockedNow }: { alertId: string; nick: string; open: boolean; blockedNow: boolean }) {
  const [asking, setAsking] = useState<Resolution | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = ru.security;

  function close() {
    setAsking(null);
    setPassword(null);
    setCopied(false);
    router.refresh();
  }

  function run(resolution: Resolution) {
    start(async () => {
      const r = await resolveSecurityAlert({ id: alertId, resolution });
      if (!r.ok) {
        toast.error(r.error);
        setAsking(null);
        return;
      }
      toast.success(r.message);
      if (r.data?.password) setPassword(r.data.password);
      else close();
    });
  }

  function unblock() {
    start(async () => {
      const r = await unblockFromAlert(alertId);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success(ru.admin.copied);
    } catch {
      toast.error(ru.errors.generic);
    }
  }

  const copy2 = {
    OK: { title: t.okTitle, text: t.okText, confirm: t.ok },
    PASSWORD_RESET: { title: t.resetTitle(nick), text: t.resetText, confirm: t.reset },
    BLOCKED: { title: t.blockTitle(nick), text: t.blockText, confirm: t.block },
  } as const;

  return (
    <div className="flex flex-wrap gap-2" data-testid="alert-actions">
      {open && (
        <>
          <Button variant="outline" onClick={() => setAsking("OK")} data-testid="alert-ok">
            <ShieldCheck /> {t.ok}
          </Button>
          <Button variant="outline" onClick={() => setAsking("PASSWORD_RESET")} data-testid="alert-reset">
            <KeyRound /> {t.reset}
          </Button>
          <Button variant="destructive" onClick={() => setAsking("BLOCKED")} data-testid="alert-block">
            <ShieldOff /> {t.block}
          </Button>
        </>
      )}
      {blockedNow && (
        <Button onClick={unblock} disabled={pending} data-testid="alert-unblock">
          {pending ? <Loader2 className="animate-spin" /> : <LockOpen />} {t.unblock}
        </Button>
      )}
      <Dialog open={asking !== null} onOpenChange={(o) => !o && (password ? close() : setAsking(null))}>
        <DialogContent closeLabel={ru.common.close}>
          {asking && (
            <>
              <DialogHeader>
                <DialogTitle>{copy2[asking].title}</DialogTitle>
                <DialogDescription>{password ? ru.admin.resetPasswordShowOnce : copy2[asking].text}</DialogDescription>
              </DialogHeader>
              {password && (
                <div className="inset-field flex items-center justify-between gap-3 rounded-md px-4 py-3" data-testid="temp-password-box">
                  <div>
                    <p className="text-xs text-muted-foreground">{ru.admin.resetPasswordResult}</p>
                    <p className="font-mono text-2xl font-bold tracking-wider select-all" data-testid="temp-password">
                      {password}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={copy}>
                    {copied ? <Check /> : <Copy />} {ru.admin.copy}
                  </Button>
                </div>
              )}
              <DialogFooter>
                {password ? (
                  <Button onClick={close}>{ru.common.close}</Button>
                ) : (
                  <>
                    <DialogClose asChild>
                      <Button variant="outline">{ru.common.cancel}</Button>
                    </DialogClose>
                    <Button variant={asking === "BLOCKED" ? "destructive" : "default"} disabled={pending} onClick={() => run(asking)} data-testid="confirm-action">
                      {pending && <Loader2 className="animate-spin" />}
                      {copy2[asking].confirm}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
