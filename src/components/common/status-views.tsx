import Link from "next/link";
import { FileQuestion, Inbox, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

export function EmptyState({ text, className, children }: { text: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center", className)} data-testid="empty-state">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function FullPageMessage({ icon, title, text, code }: { icon: React.ReactNode; title: string; text: string; code: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{code}</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{text}</p>
      <Button asChild>
        <Link href="/">{ru.errors.toHome}</Link>
      </Button>
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
