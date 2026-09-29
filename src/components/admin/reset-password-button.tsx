"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resetUserPassword } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";

/** Сброс пароля: подтверждение → временный пароль показывается один раз. */
export function ResetPasswordButton({ userId, nick, variant = "outline" }: { userId: string; nick: string; variant?: "outline" | "default" }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const r = await resetUserPassword(userId);
      if (r.ok && r.data) {
        setPassword(r.data.password);
        toast.success(r.message);
      } else if (!r.ok) toast.error(r.error);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} data-testid="reset-password">
          <KeyRound /> {ru.admin.resetPassword}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={ru.common.close}>
        <DialogHeader>
          <DialogTitle>{ru.admin.resetPasswordTitle(nick)}</DialogTitle>
          <DialogDescription>{password ? ru.admin.resetPasswordShowOnce : ru.admin.resetPasswordText}</DialogDescription>
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
            <DialogClose asChild>
              <Button>{ru.common.close}</Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="outline">{ru.common.cancel}</Button>
              </DialogClose>
              <Button onClick={run} disabled={pending} data-testid="confirm-reset">
                {pending && <Loader2 className="animate-spin" />}
                {ru.admin.resetPassword}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
