"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";

export function ErrorView({ reset }: { reset: () => void }) {
  return (
    <div className="paper mx-auto my-10 flex max-w-md flex-col items-center justify-center gap-4 rounded-md p-8 text-center" role="alert">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h2 className="font-serif text-xl font-bold">{ru.errors.errorTitle}</h2>
      <p className="max-w-md text-muted-foreground">{ru.errors.errorText}</p>
      <Button onClick={reset}>{ru.errors.retry}</Button>
    </div>
  );
}
