import { ru } from "@/lib/i18n/ru";
import { ratingLevel } from "@/lib/rating";

const CX = 110;
const CY = 110;
const R = 82;

function polar(value: number, radius: number) {
  const angle = Math.PI * (1 - value / 100);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function arc(from: number, to: number, radius: number) {
  const a = polar(from, radius);
  const b = polar(to, radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** Аналоговый стрелочный прибор с латунным ободком: красная зона <50, жёлтая 50–79, зелёная ≥80. */
export function Gauge({ value, label }: { value: number | null; label: string }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const angle = -90 + v * 1.8;
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  return (
    <figure className="flex flex-col items-center" data-testid="rating-gauge" data-rating-level={ratingLevel(value)}>
      <svg viewBox="0 0 220 132" className="w-full max-w-[280px]" role="img" aria-label={`${label}: ${value === null ? ru.common.noData : value.toFixed(1)}`}>
        <defs>
          <linearGradient id="gauge-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brass-light)" />
            <stop offset="0.5" stopColor="var(--brass)" />
            <stop offset="1" stopColor="var(--brass-dark)" />
          </linearGradient>
          <radialGradient id="gauge-face" cx="0.5" cy="0.85" r="0.9">
            <stop offset="0" stopColor="#fbf6e9" />
            <stop offset="1" stopColor="#e6d9b8" />
          </radialGradient>
          <radialGradient id="gauge-cap" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff1c7" />
            <stop offset="0.5" stopColor="var(--brass)" />
            <stop offset="1" stopColor="var(--brass-dark)" />
          </radialGradient>
        </defs>
        {/* Латунный ободок и циферблат */}
        <path d={`M 6 ${CY + 6} A 104 104 0 0 1 214 ${CY + 6} Z`} fill="url(#gauge-brass)" stroke="#5e4214" strokeWidth="1" />
        <path d={`M 16 ${CY + 2} A 94 94 0 0 1 204 ${CY + 2} Z`} fill="url(#gauge-face)" />
        {/* Цветные зоны */}
        <path d={arc(0, 50, R)} stroke="#c0392b" strokeWidth="9" fill="none" opacity="0.85" />
        <path d={arc(50, 80, R)} stroke="#d4a017" strokeWidth="9" fill="none" opacity="0.9" />
        <path d={arc(80, 100, R)} stroke="#2e8b57" strokeWidth="9" fill="none" opacity="0.9" />
        {/* Деления */}
        {ticks.map((t) => {
          const major = t % 10 === 0;
          const a = polar(t, R - 7);
          const b = polar(t, major ? R - 17 : R - 12);
          return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2b1d14" strokeWidth={major ? 1.6 : 0.8} />;
        })}
        {[0, 50, 100].map((t) => {
          const p = polar(t, R - 28);
          return (
            <text key={t} x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-pt-serif)" fill="#2b1d14">
              {t}
            </text>
          );
        })}
        {/* Стрелка */}
        <g className="needle" style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${CX}px ${CY}px` }} opacity={value === null ? 0.35 : 1}>
          <polygon points={`${CX - 3},${CY} ${CX + 3},${CY} ${CX + 0.8},${CY - R + 6} ${CX - 0.8},${CY - R + 6}`} fill="#8b1a12" />
        </g>
        <circle cx={CX} cy={CY} r="8" fill="url(#gauge-cap)" stroke="#5e4214" strokeWidth="1" />
      </svg>
    </figure>
  );
}
