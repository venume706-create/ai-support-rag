import Link from "next/link";
import { FileQuestion, Inbox, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

export function EmptyState({ text, className, children }: { text: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border px-6 py-10 text-center", className)} data-testid="empty-state">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="font-hand text-2xl text-muted-foreground">{text}</p>
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
