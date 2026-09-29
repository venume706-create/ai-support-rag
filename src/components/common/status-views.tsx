import Link from "next/link";
import { FileQuestion, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";
import { Illustration, type IllustrationKind } from "./illustrations";
import { cn } from "@/lib/utils";

/** Пустой экран: иллюстрация, понятная фраза и (по желанию) кнопка «что делать». */
export function EmptyState({ text, kind = "generic", className, children }: { text: string; kind?: IllustrationKind; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-6 py-8 text-center", className)} data-testid="empty-state" data-kind={kind}>
      <Illustration kind={kind} className="empty-float h-28 w-auto" />
      <p className="handwritten text-2xl text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function FullPageMessage({ icon, title, text, code }: { icon: React.ReactNode; title: string; text: string; code: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="paper flex w-full max-w-md flex-col items-center gap-4 rounded-md p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">{icon}</div>
      <p className="stamp stamp-red text-base">{code}</p>
      <h1 className="font-serif text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{text}</p>
      <Button asChild>
        <Link href="/">{ru.errors.toHome}</Link>
      </Button>
      </div>
    </div>
  );
}

export function ForbiddenView() {
  return (
    <FullPageMessage
      code="403"
      icon={<ShieldX className="size-7 text-destructive" />}
      title={ru.errors.forbiddenTitle}
      text={ru.errors.forbiddenText}
    />
  );
}

export function NotFoundView() {
  return (
    <FullPageMessage
      code="404"
      icon={<FileQuestion className="size-7 text-muted-foreground" />}
      title={ru.errors.notFoundTitle}
      text={ru.errors.notFoundText}
    />
  );
}
