import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-on-wood-muted hover:text-on-wood">
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
        )}
        <h1 className="font-serif text-2xl font-bold break-words text-on-wood [text-shadow:0_2px_3px_rgb(0_0_0/0.5)] md:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-on-wood-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
