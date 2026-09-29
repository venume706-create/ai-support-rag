import type { Metadata } from "next";
import { HintTip } from "@/components/common/hint-tip";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeDetails } from "@/lib/audit-view";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.journal.title };

const WHEN = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "Asia/Tashkent" });
const PAGE_SIZE = 20;

export default async function AdminJournalPage({ searchParams }: PageProps<"/admin/journal">) {
  const sp = await searchParams;
  const query = parseListQuery(sp);
  const rawAction = typeof sp.action === "string" ? sp.action : "";
  const action = rawAction in ru.journal.actions ? rawAction : "";
  const term = searchTerm(query.q);

  // Поиск по нику и объекту — в памяти по нужной выборке: SQLite и PostgreSQL по-разному считают регистр кириллицы
  const all = await db.auditLog.findMany({
    where: { action: action || undefined },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { id: true, createdAt: true, actorLabel: true, action: true, targetLabel: true, details: true },
  });
  const filtered = term ? all.filter((r) => searchTerm(`${r.actorLabel} ${r.targetLabel}`).includes(term)) : all;
  const info = paginate(filtered.length, query.page, PAGE_SIZE);
  const rows = filtered.slice(info.skip, info.skip + info.take);
  const filtering = Boolean(term || action);

  return (
    <>
      <PageHeader
        title={ru.journal.title}
        description={ru.journal.description}
        actions={<HintTip title={ru.journal.title}>{ru.journal.hint}</HintTip>}
      />
      <ListToolbar
        pathname="/admin/journal"
        q={query.q}
        searchPlaceholder={ru.journal.searchPlaceholder}
        filters={[{ name: "action", value: action, allLabel: ru.journal.allActions, options: Object.entries(ru.journal.actions).map(([value, label]) => ({ value, label })) }]}
      />
      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          {rows.length === 0 ? (
            <EmptyState kind={filtering ? "search" : "board"} className="my-3" text={filtering ? ru.empty.searchNothing : ru.journal.empty} />
          ) : (
            <Table data-testid="audit-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{ru.journal.when}</TableHead>
                  <TableHead>{ru.journal.who}</TableHead>
                  <TableHead>{ru.journal.what}</TableHead>
                  <TableHead>{ru.journal.target}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-testid="audit-row" data-action={r.action}>
                    <TableCell className="whitespace-nowrap tabular-nums">{WHEN.format(r.createdAt)}</TableCell>
                    <TableCell label={ru.journal.who} className="font-bold">
                      {r.actorLabel}
                    </TableCell>
                    <TableCell label={ru.journal.what}>{ru.journal.actions[r.action] ?? r.action}</TableCell>
                    <TableCell label={ru.journal.target}>
                      {r.targetLabel || ru.common.dash}
                      {r.details && <p className="text-xs break-words text-muted-foreground">{describeDetails(r.details)}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination info={info} pathname="/admin/journal" params={{ q: query.q, action }} />
        </CardContent>
      </Card>
    </>
  );
}
