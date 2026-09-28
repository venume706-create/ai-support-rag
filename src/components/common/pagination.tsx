import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";
import { withParams, type PageInfo } from "@/lib/pagination";

export function Pagination({
  info,
  pathname,
  params,
  pageKey = "page",
  hash,
}: {
  info: PageInfo;
  pathname: string;
  params: Record<string, string | number | undefined>;
  /** Имя параметра номера страницы (несколько списков на одной странице) */
  pageKey?: string;
  /** Якорь, к которому вернуться после перехода */
  hash?: string;
}) {
  const href = (page: number) => `${withParams(pathname, params, { [pageKey]: page })}${hash ? `#${hash}` : ""}`;
  if (info.total === 0) return null;
  const from = info.skip + 1;
  const to = Math.min(info.skip + info.take, info.total);
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-dotted border-border pt-3 text-sm" data-testid="pagination">
      <span className="text-muted-foreground">{ru.common.shown(from, to, info.total)}</span>
      {info.pages > 1 && (
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground sm:inline">{ru.common.page(info.page, info.pages)}</span>
          {info.page > 1 ? (
            <Button asChild variant="outline" size="icon" aria-label={ru.common.prev}>
              <Link href={href(info.page - 1)} scroll={!hash}>
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
              <Link href={href(info.page + 1)} scroll={!hash}>
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
