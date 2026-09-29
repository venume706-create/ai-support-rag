import { ru } from "@/lib/i18n/ru";
import { attendanceRatio, ratingLevel, type AttendanceMark } from "@/lib/rating";
import { cn } from "@/lib/utils";

/* ---------- Гистограмма оценок ---------- */

const GRADE_COLOR: Record<number, string> = { 5: "#2e8b57", 4: "#4a72b0", 3: "#d4a017", 2: "#d9722a", 1: "#c0392b" };

/** Сколько оценок каждого достоинства: столбики на «миллиметровке», цифры — «от руки». */
export function GradeBars({ counts }: { counts: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const max = Math.max(1, ...Object.values(counts));
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return (
    <figure data-testid="grade-bars" aria-label={`${ru.charts.gradesTitle}: ${[5, 4, 3, 2, 1].map((g) => `${g} — ${counts[g as 5]}`).join(", ")}`} role="img">
      <div className="ruled flex h-44 items-end justify-around gap-2 rounded-md px-4 pt-6 pb-2 pl-14">
        {([5, 4, 3, 2, 1] as const).map((g) => (
          <div key={g} className="flex h-full flex-1 flex-col items-center justify-end gap-1" data-grade-bar={g} data-count={counts[g]}>
            <span className="handwritten text-2xl text-ink-red">{counts[g]}</span>
            <div
              className="bar-grow w-full max-w-12 rounded-t-md shadow-[inset_0_2px_0_rgb(255_255_255/0.45),0_2px_3px_rgb(0_0_0/0.3)]"
              style={{ height: `${Math.max(counts[g] === 0 ? 2 : 8, (counts[g] / max) * 100)}%`, background: `linear-gradient(180deg, ${GRADE_COLOR[g]}, color-mix(in oklab, ${GRADE_COLOR[g]} 60%, black))` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-2 pt-1 pl-10">
        {[5, 4, 3, 2, 1].map((g) => (
          <span key={g} className="handwritten flex-1 text-center text-2xl">
            {g}
          </span>
        ))}
      </div>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">{ru.charts.gradesTotal(total)}</figcaption>
    </figure>
  );
}

/* ---------- Кольцо посещаемости ---------- */

const ATT_COLOR: Record<AttendanceMark, string> = { PRESENT: "#2e8b57", LATE: "#d4a017", ABSENT: "#c0392b", EXCUSED: "#4a72b0" };
const ATT_ORDER: AttendanceMark[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

/** Кольцевая диаграмма посещаемости со сводкой: «был / опоздал / не был / уваж.» и процентом по рейтинговой формуле. */
export function AttendanceRing({ counts }: { counts: Record<AttendanceMark, number> }) {
  const total = ATT_ORDER.reduce((s, k) => s + counts[k], 0);
  const R = 46;
  const C = 2 * Math.PI * R;
  const statuses = ATT_ORDER.flatMap((k) => Array<AttendanceMark>(counts[k]).fill(k));
  const ratio = attendanceRatio(statuses).ratio;
  let offset = 0;
  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row" data-testid="attendance-ring" role="img" aria-label={`${ru.charts.attendanceTitle}: ${ATT_ORDER.map((k) => `${ru.attendanceStatusFull[k]} — ${counts[k]}`).join(", ")}`}>
      <svg viewBox="0 0 120 120" className="size-40 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--paper-line)" strokeWidth="16" />
        {total > 0 &&
          ATT_ORDER.map((k) => {
            if (counts[k] === 0) return null;
            const len = (counts[k] / total) * C;
            const el = (
              <circle key={k} cx="60" cy="60" r={R} fill="none" stroke={ATT_COLOR[k]} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-offset} data-status={k} data-count={counts[k]} />
            );
            offset += len;
            return el;
          })}
        <circle cx="60" cy="60" r="34" fill="var(--paper)" opacity="0.9" />
        <g className="rotate-90" style={{ transformOrigin: "60px 60px" }}>
          <text x="60" y="60" textAnchor="middle" fontFamily="var(--font-pt-serif)" fontWeight="700" fontSize="22" fill="var(--ink)">
            {ratio === null ? "—" : `${Math.round(ratio * 100)}%`}
          </text>
          <text x="60" y="76" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
            {ru.charts.attendanceCenter}
          </text>
        </g>
      </svg>
      <ul className="grid w-full max-w-xl grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-x-10">
        {ATT_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded-sm shadow-inner" style={{ background: ATT_COLOR[k] }} />
            <span className="flex-1">{ru.attendanceStatusFull[k]}</span>
            <span className="handwritten text-2xl">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------- Столбики «рейтинг по группам» ---------- */

const BAR_COLOR = { high: "#2e8b57", medium: "#d4a017", low: "#c0392b", none: "#9a8f7a" } as const;

/** Горизонтальные столбики в латунных рамках: подпись, значение, цвет по зонам рейтинга. */
export function BarList({ items, unit = "" }: { items: { key: string; label: string; value: number | null; hint?: string }[]; unit?: string }) {
  return (
    <ul className="grid gap-3" data-testid="bar-list">
      {items.map((it) => {
        const level = ratingLevel(it.value);
        return (
          <li key={it.key} className="grid gap-1" data-bar={it.key} data-value={it.value ?? ""}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-bold">{it.label}</span>
              <span className={cn("font-serif font-bold tabular-nums", it.value === null && "font-sans text-xs font-normal text-muted-foreground")}>
                {it.value === null ? ru.common.noData : `${it.value}${unit}`}
              </span>
            </div>
            <div className="brass relative h-4 w-full overflow-hidden rounded-full p-[2px]" role="progressbar" aria-label={it.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(it.value ?? 0)}>
              <div className="relative h-full w-full overflow-hidden rounded-full bg-[#1f160f] shadow-[inset_0_1px_2px_rgb(0_0_0/0.8)]">
                <div className="bar-fill h-full rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]" style={{ width: `${Math.max(0, Math.min(100, it.value ?? 0))}%`, background: BAR_COLOR[level] }} />
              </div>
            </div>
            {it.hint && <span className="text-xs text-muted-foreground">{it.hint}</span>}
          </li>
        );
      })}
    </ul>
  );
}
