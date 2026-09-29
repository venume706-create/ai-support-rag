import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RatingBadge } from "@/components/common/badges";
import { HintTip } from "@/components/common/hint-tip";
import { PersonName } from "@/components/common/person-name";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttentionRow } from "@/lib/attention-data";
import { ru } from "@/lib/i18n/ru";

const t = ru.attention;

function phrase(r: AttentionRow["reasons"][number]) {
  switch (r.code) {
    case "lowRating":
      return t.lowRating(r.value);
    case "absences":
      return t.absences(r.value);
    case "homework":
      return t.homework(r.value);
    case "grades":
      return t.grades(r.value);
  }
}

/** «Кому нужно внимание»: ученики с тревожными признаками и понятные причины. */
export function AttentionList({ rows, hrefFor }: { rows: AttentionRow[]; hrefFor: (studentId: string) => string }) {
  return (
    <Card data-testid="attention">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1">
          <AlertTriangle className="size-5 text-ink-red" /> {t.title}
          <HintTip title={t.title}>{t.hint}</HintTip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState kind="star" text={t.empty} />
        ) : (
          <ul className="grid gap-3" data-testid="attention-list">
            {rows.map((r) => (
              <li key={r.studentId} className="border-b border-dotted border-border pb-3 last:border-0" data-testid="attention-row">
                <div className="flex items-start justify-between gap-3">
                  <Link href={hrefFor(r.studentId)} className="min-w-0 hover:underline">
                    <PersonName user={r.person} avatar="sm" />
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.groups.join(", ")}</p>
                  </Link>
                  <RatingBadge value={r.rating} />
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {r.reasons.map((x) => (
                    <li key={x.code} data-reason={x.code} className="rounded-full bg-ink-red/10 px-2.5 py-1 text-xs font-bold text-ink-red">
                      {phrase(x)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
