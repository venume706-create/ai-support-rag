"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";

/** Кнопка действия с подтверждением в диалоге. */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  action,
  redirectTo,
  variant = "destructive",
  size,
  icon,
  testId,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<ActionResult<unknown>>;
  redirectTo?: string;
  variant?: "destructive" | "outline" | "default";
  size?: "sm" | "default" | "icon";
  icon?: React.ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (result.message) toast.success(result.message);
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} data-testid={testId} aria-label={size === "icon" ? label : undefined}>
          {icon}
          {size !== "icon" && label}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={ru.common.close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{ru.common.cancel}</Button>
          </DialogClose>
          <Button variant={variant === "outline" ? "default" : variant} onClick={run} disabled={pending} data-testid="confirm-action">
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
