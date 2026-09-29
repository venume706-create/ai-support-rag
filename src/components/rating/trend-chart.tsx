import { formatDayMonth } from "@/lib/dates";
import { ru } from "@/lib/i18n/ru";
import type { SeriesPoint } from "@/lib/rating-history";

const W = 320;
const H = 150;
const PAD = { l: 30, r: 12, t: 14, b: 26 };

/** График рейтинга за 8 недель на «миллиметровке»: чернильная линия, точки-кнопки, разрывы там, где данных ещё не было. */
export function TrendChart({ series }: { series: SeriesPoint[] }) {
  const values = series.map((p) => p.total).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{ru.insights.chartEmpty}</p>;
  }
  const lo = Math.max(0, Math.floor((Math.min(...values) - 5) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...values) + 5) / 5) * 5);
  const span = Math.max(10, hi - lo);
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, series.length - 1);
  const y = (v: number) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);

  // Линия рисуется отдельными отрезками, где есть данные
  const segments: { i: number; v: number }[][] = [];
  series.forEach((p, i) => {
    if (p.total === null) return void (segments.length && segments[segments.length - 1].length && segments.push([]));
    if (!segments.length) segments.push([]);
    segments[segments.length - 1].push({ i, v: p.total });
  });
  const grid = [lo, lo + span / 2, lo + span];
  const summary = series.map((p, i) => `${i === series.length - 1 ? ru.insights.chartNow : ru.insights.chartWeeksAgo(series.length - 1 - i)}: ${p.total === null ? ru.common.noData : p.total}`).join("; ");

  return (
    <figure className="mx-auto w-full max-w-xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${ru.insights.chartTitle}. ${summary}`} data-testid="trend-chart">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink-blue)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--ink-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Миллиметровка */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`v${i}`} x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} stroke="var(--paper-line)" strokeWidth="0.7" />
        ))}
        {grid.map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="var(--paper-line)" strokeWidth="0.9" strokeDasharray="3 3" />
            <text x={PAD.l - 5} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
              {Math.round(g)}
            </text>
          </g>
        ))}
        {segments.map((seg, s) => {
          const d = seg.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
          const area = seg.length > 1 ? `${d} L${x(seg[seg.length - 1].i).toFixed(1)} ${H - PAD.b} L${x(seg[0].i).toFixed(1)} ${H - PAD.b} Z` : "";
          return (
            <g key={s}>
              {area && <path d={area} fill="url(#trend-fill)" />}
              {seg.length > 1 && <path d={d} pathLength={1} className="chart-line" fill="none" stroke="var(--ink-blue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
        {series.map((p, i) =>
          p.total === null ? null : (
            <circle key={i} cx={x(i)} cy={y(p.total)} r={i === series.length - 1 ? 5 : 3.6} fill="var(--paper)" stroke="var(--ink-blue)" strokeWidth={i === series.length - 1 ? 3 : 2}>
              <title>{`${formatDayMonth(p.date)}: ${p.total}`}</title>
            </circle>
          ),
        )}
        {[0, Math.floor((series.length - 1) / 2), series.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--muted-foreground)">
            {i === series.length - 1 ? ru.insights.chartNow : ru.insights.chartWeeksAgo(series.length - 1 - i)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
