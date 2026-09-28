import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ru } from "@/lib/i18n/ru";
import { ratingLevel, type RatingPart, type StudentRating } from "@/lib/rating";
import type { RatingPeriod } from "@/lib/rating-data";
import { cn } from "@/lib/utils";

const TEXT = { high: "text-emerald-600 dark:text-emerald-400", medium: "text-amber-600 dark:text-amber-400", low: "text-red-600 dark:text-red-400", none: "text-muted-foreground" };
const BAR = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-red-500", none: "bg-muted-foreground" };

export function ratingTextClass(value: number | null) {
  return TEXT[ratingLevel(value)];
}

function PartRow({ label, part, hint }: { label: string; part: RatingPart; hint: string }) {
  const percent = part.ratio === null ? null : part.ratio * 100;
  const level = ratingLevel(percent);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", part.points === null && "text-muted-foreground")}>
          {part.points === null ? ru.common.noData : ru.rating.points(part.points, part.max)}
        </span>
      </div>
      <Progress value={percent ?? 0} indicatorClassName={BAR[level]} label={label} />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

export function PeriodSwitch({ period, hrefFor }: { period: RatingPeriod; hrefFor: (p: RatingPeriod) => string }) {
  const items: { value: RatingPeriod; label: string }[] = [
    { value: "month", label: ru.rating.periodMonth },
    { value: "all", label: ru.rating.periodAll },
  ];
  return (
    <div className="inline-flex rounded-lg bg-muted p-1 text-sm" role="tablist" aria-label={ru.rating.period}>
      {items.map((item) => (
        <Link
          key={item.value}
          href={hrefFor(item.value)}
          role="tab"
          aria-selected={period === item.value}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors",
            period === item.value && "bg-background text-foreground shadow-sm",
          )}
          scroll={false}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function RatingCard({
  rating,
  title = ru.rating.title,
  period,
  hrefFor,
}: {
  rating: StudentRating;
  title?: string;
  period: RatingPeriod;
  hrefFor: (p: RatingPeriod) => string;
}) {
  const partial =
    rating.total !== null && [rating.grades.points, rating.attendance.points, rating.homework.points].some((p) => p === null);
  return (
    <Card data-testid="rating-card">
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {partial && <CardDescription className="mt-1">{ru.rating.partialNote}</CardDescription>}
        </div>
        <PeriodSwitch period={period} hrefFor={hrefFor} />
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted/50 py-4">
          <span
            className={cn("text-5xl font-bold tabular-nums", ratingTextClass(rating.total), rating.total === null && "text-2xl")}
            data-testid="rating-total"
            data-rating-level={ratingLevel(rating.total)}
          >
            {rating.total === null ? ru.common.noData : rating.total.toFixed(1)}
          </span>
          {rating.total !== null && <span className="text-sm text-muted-foreground">{ru.rating.outOf}</span>}
        </div>
        <div className="grid gap-4">
          <PartRow
            label={ru.rating.grades}
            part={rating.grades}
            hint={`${ru.rating.averageGrade}: ${rating.grades.average ?? ru.common.dash} · ${ru.rating.gradesCounted(rating.grades.count)}`}
          />
          <PartRow label={ru.rating.attendance} part={rating.attendance} hint={ru.rating.lessonsCounted(rating.attendance.counted)} />
          <PartRow label={ru.rating.homework} part={rating.homework} hint={ru.rating.homeworkCounted(rating.homework.count)} />
        </div>
      </CardContent>
    </Card>
  );
}
