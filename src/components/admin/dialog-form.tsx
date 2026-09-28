"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";

const DialogCloseContext = createContext<(() => void) | undefined>(undefined);

/** Закрыть диалог, внутри которого находится форма (undefined вне диалога). */
export function useDialogClose() {
  return useContext(DialogCloseContext);
}

/** Кнопка, открывающая форму в диалоге. Форма закрывает диалог после успеха через useDialogClose(). */
export function DialogForm({
  trigger,
  title,
  description,
  icon,
  variant = "default",
  testId,
  children,
}: {
  trigger: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "outline";
  testId?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} data-testid={testId}>
          {icon}
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={ru.common.close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && <DialogCloseContext.Provider value={() => setOpen(false)}>{children}</DialogCloseContext.Provider>}
      </DialogContent>
    </Dialog>
  );
}
