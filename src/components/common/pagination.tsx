import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";
import { withParams, type PageInfo } from "@/lib/pagination";

export function Pagination({
  info,
  pathname,
  params,
}: {
  info: PageInfo;
  pathname: string;
  params: Record<string, string | number | undefined>;
}) {
  if (info.total === 0) return null;
  const from = info.skip + 1;
  const to = Math.min(info.skip + info.take, info.total);
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm" data-testid="pagination">
      <span className="text-muted-foreground">{ru.common.shown(from, to, info.total)}</span>
      {info.pages > 1 && (
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground sm:inline">{ru.common.page(info.page, info.pages)}</span>
          {info.page > 1 ? (
            <Button asChild variant="outline" size="icon" aria-label={ru.common.prev}>
              <Link href={withParams(pathname, params, { page: info.page - 1 })}>
                <ChevronLeft />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label={ru.common.prev}>
              <ChevronLeft />
            </Button>
          )}
          {info.page < info.pages ? (
            <Button asChild variant="outline" size="icon" aria-label={ru.common.next}>
              <Link href={withParams(pathname, params, { page: info.page + 1 })}>
                <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label={ru.common.next}>
              <ChevronRight />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
