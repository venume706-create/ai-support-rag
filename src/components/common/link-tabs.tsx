import Link from "next/link";
import { cn } from "@/lib/utils";

/** Переключатель-ссылки в стиле «латунная пластина» (как переключатель периода). Работает без JavaScript. */
export function LinkTabs({
  items,
  label,
  testId,
  className,
}: {
  items: Array<{ href: string; label: string; active: boolean; count?: number }>;
  label: string;
  testId?: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} data-testid={testId} className={cn("inset-field inline-flex max-w-full flex-wrap rounded-md p-1 text-sm", className)}>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "true" : undefined}
          scroll={false}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded px-4 font-bold text-muted-foreground transition-colors", item.active && "brass text-[#2b1d14]")}
        >
          {item.label}
          {item.count !== undefined && <span className="tabular-nums">{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
