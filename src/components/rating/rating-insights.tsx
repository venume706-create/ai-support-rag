import { ArrowDownRight, ArrowRight, ArrowUpRight, Lightbulb, MapPin, Star, Target, CalendarCheck, BookCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ru } from "@/lib/i18n/ru";
import type { StudentInsights } from "@/lib/student-insights";
import type { TipAction } from "@/lib/rating-tips";
import { cn, points } from "@/lib/utils";
import { HowItWorks } from "./how-it-works";
import { RankBadge } from "./medal";
import { TrendChart } from "./trend-chart";

const TIP_ICON: Record<TipAction, React.ComponentType<{ className?: string }>> = { grade5: Star, attend: CalendarCheck, homework: BookCheck };

export function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-sm text-muted-foreground" data-testid="delta">{ru.insights.deltaNone}</span>;
  const text = delta > 0 ? ru.insights.deltaUp(`+${delta}`) : delta < 0 ? ru.insights.deltaDown(String(delta)) : ru.insights.deltaZero;
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold", delta > 0 ? "bg-emerald-500/15 text-ink-green" : delta < 0 ? "bg-red-500/15 text-ink-red" : "bg-black/10 text-muted-foreground")}
      data-testid="delta"
      data-delta={delta}
    >
      <Icon className="size-4" /> {text}
    </span>
  );
}

/** Ранг и путь к следующему: значок, название, динамика за неделю, шкала «до следующего ранга». */
export function RankSummary({ insights }: { insights: StudentInsights }) {
  const { rank, nextRank, pointsToNext } = insights;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center" data-testid="rank-summary" data-rank={rank.code}>
      <RankBadge rank={rank.code} size={104} label={`${ru.insights.rankLabel}: ${ru.ranks[rank.code]}`} />
      <div className="grid w-full min-w-0 gap-2 text-center sm:text-left">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{ru.insights.rankLabel}</p>
          <p className="font-serif text-3xl font-bold" data-testid="rank-name">
            {ru.ranks[rank.code]}
          </p>
        </div>
        <div className="flex justify-center sm:justify-start">
          <DeltaChip delta={insights.weeklyDelta} />
        </div>
        {nextRank && pointsToNext !== null ? (
          <div className="grid gap-1">
            <Progress value={insights.rankProgress * 100} label={ru.insights.toNext(points(pointsToNext), ru.ranks[nextRank.code])} />
            <p className="text-sm font-bold" data-testid="to-next">
              {ru.insights.toNext(points(pointsToNext), ru.ranks[nextRank.code])}
            </p>
          </div>
        ) : (
          <p className="text-sm font-bold" data-testid="to-next">
            {ru.insights.topRank}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Рейтинг «в развитии»: ранг, динамика, график за 8 недель, места в группах и — только ученику — подсказки.
 * view="staff": для учителя и админа (без подсказок и без кнопки объяснения).
 */
export function RatingInsights({ insights, view = "student" }: { insights: StudentInsights; view?: "student" | "staff" }) {
  return (
    <Card data-testid="rating-insights">
      <CardHeader className="gap-1 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{ru.insights.rankLabel}</CardTitle>
          <CardDescription>{ru.insights.rankScope}</CardDescription>
        </div>
        {view === "student" && <HowItWorks />}
      </CardHeader>
      <CardContent className="grid gap-6">
        <RankSummary insights={insights} />
        <section>
          <h3 className="mb-2 font-serif text-lg font-bold">{ru.insights.chartTitle}</h3>
          <TrendChart series={insights.series} />
        </section>
        {insights.places.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-bold">
              <MapPin className="size-5" /> {ru.insights.placesTitle}
            </h3>
            <ul className="flex flex-wrap gap-2" data-testid="places">
              {insights.places.map((p) => (
                <li key={p.groupId} className="rounded-md border border-dashed border-border px-3 py-2 text-sm" data-place={p.place}>
                  <span className="block text-xs text-muted-foreground">{p.groupName}</span>
                  <span className="font-bold">{p.of > 1 ? ru.insights.place(p.place, p.of) : ru.insights.placeSingle(p.place)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {view === "student" && (
          <section data-testid="tips">
            <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-bold">
              <Lightbulb className="size-5" /> {ru.insights.tipsTitle}
            </h3>
            <ul className="grid gap-2">
              {insights.tips.map((tip, i) => {
                const Icon = TIP_ICON[tip.action];
                return (
                  <li key={tip.action} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5", i === 0 && tip.gain > 0 ? "bg-brass/20" : "bg-black/[0.04] dark:bg-white/[0.05]")} data-tip={tip.action}>
                    <Icon className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1 text-sm font-bold">
                      {ru.insights.tips[tip.action]}
                      {i === 0 && tip.gain > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-ink-green">
                          <Target className="size-3.5" /> {ru.insights.tipFastest}
                        </span>
                      )}
                    </span>
                    <span className="font-serif text-lg font-bold tabular-nums">{ru.insights.tipGain(tip.gain)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
