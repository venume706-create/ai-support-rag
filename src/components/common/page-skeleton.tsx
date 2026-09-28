import { Skeleton } from "@/components/ui/skeleton";
import { ru } from "@/lib/i18n/ru";

export function PageSkeleton({ rows = 6, cards = 0 }: { rows?: number; cards?: number }) {
  return (
    <div aria-busy="true" aria-label={ru.common.loading}>
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      {cards > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      <Skeleton className="mb-4 h-10 w-full max-w-lg" />
      <div className="grid gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
