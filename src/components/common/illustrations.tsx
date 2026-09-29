import { useId } from "react";

export type IllustrationKind = "generic" | "notebook" | "board" | "star" | "calendar" | "people" | "search" | "bell";

/**
 * SVG-иллюстрации пустых экранов в стиле «кабинета учителя»: бумага, латунь, дерево, кожа.
 * Цвета берутся из токенов темы, поэтому одинаково хорошо смотрятся в светлой и тёмной теме.
 */
export function Illustration({ kind = "generic", className }: { kind?: IllustrationKind; className?: string }) {
  const id = useId().replace(/:/g, "");
  const defs = (
    <defs>
      <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--brass-light)" />
        <stop offset="0.55" stopColor="var(--brass)" />
        <stop offset="1" stopColor="var(--brass-dark)" />
      </linearGradient>
      <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--leather)" />
        <stop offset="1" stopColor="var(--leather-dark)" />
      </linearGradient>
      <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--wood)" />
        <stop offset="1" stopColor="var(--wood-dark)" />
      </linearGradient>
      <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.28" />
      </filter>
    </defs>
  );
  const ink = "var(--muted-foreground)";
  const line = "var(--paper-line)";
  const paper = "var(--paper)";
  const shade = "var(--paper-shade)";

  const scenes: Record<IllustrationKind, React.ReactNode> = {
    // Раскрытая тетрадь с карандашом
    notebook: (
      <g filter={`url(#${id}s)`}>
        <path d="M20 96 L20 34 Q50 26 80 36 Q110 26 140 34 L140 96 Q110 88 80 98 Q50 88 20 96Z" fill={`url(#${id}l)`} />
        <path d="M26 92 L26 38 Q52 32 78 40 L78 94 Q52 86 26 92Z" fill={paper} />
        <path d="M82 40 Q108 32 134 38 L134 92 Q108 86 82 94Z" fill={shade} />
        {[48, 58, 68, 78].map((y) => (
          <g key={y} stroke={line} strokeWidth="1.2">
            <path d={`M32 ${y} Q52 ${y - 5} 72 ${y + 1}`} fill="none" />
            <path d={`M88 ${y + 1} Q108 ${y - 5} 128 ${y}`} fill="none" />
          </g>
        ))}
        <line x1="30" y1="42" x2="30" y2="90" stroke="var(--paper-margin)" strokeWidth="1.2" />
        <g transform="rotate(-38 118 70)">
          <rect x="96" y="66" width="46" height="7" rx="1.5" fill={`url(#${id}b)`} />
          <path d="M96 66 L88 69.5 L96 73Z" fill="var(--paper-shade)" stroke={ink} strokeWidth="0.6" />
          <path d="M88 69.5 L85 69.5" stroke="var(--ink)" strokeWidth="1.6" />
        </g>
      </g>
    ),
    // Пустая пробковая доска
    board: (
      <g filter={`url(#${id}s)`}>
        <rect x="18" y="18" width="124" height="84" rx="6" fill={`url(#${id}w)`} />
        <rect x="25" y="25" width="110" height="70" rx="3" fill="var(--cork)" />
        {[[40, 40], [110, 34], [60, 78], [122, 82], [90, 58]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" fill="#000" opacity="0.18" />
        ))}
        <g transform="rotate(-4 80 60)">
          <rect x="52" y="38" width="56" height="42" rx="2" fill={paper} stroke={line} strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="80" cy="38" r="4.5" fill={`url(#${id}b)`} />
          <path d="M60 52h40M60 60h32M60 68h24" stroke={line} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
    ),
    // Латунная медаль-звезда
    star: (
      <g filter={`url(#${id}s)`}>
        <circle cx="80" cy="62" r="42" fill="none" stroke={ink} strokeOpacity="0.4" strokeWidth="1.6" strokeDasharray="4 5" />
        <circle cx="80" cy="62" r="34" fill={`url(#${id}b)`} stroke="var(--brass-dark)" strokeWidth="1.5" />
        <circle cx="80" cy="62" r="27" fill={paper} stroke="var(--brass-dark)" strokeOpacity="0.6" strokeWidth="1.2" />
        <path d="M80 44l5.4 11 12.1 1.7-8.8 8.5 2.1 12L80 71.4 69.2 77.2l2.1-12-8.8-8.5 12.1-1.7z" fill="none" stroke="var(--brass-dark)" strokeWidth="2.2" strokeLinejoin="round" strokeDasharray="4 3" />
        <ellipse cx="68" cy="46" rx="14" ry="6" fill="#fff" opacity="0.3" transform="rotate(-30 68 46)" />
      </g>
    ),
    // Настольный календарь на кольцах
    calendar: (
      <g filter={`url(#${id}s)`}>
        <rect x="30" y="24" width="100" height="78" rx="5" fill={paper} stroke={line} strokeWidth="1.2" />
        <path d="M30 29a5 5 0 0 1 5-5h90a5 5 0 0 1 5 5v14H30z" fill={`url(#${id}l)`} />
        {[46, 66, 86, 106, 126].map((x) => (
          <g key={x}>
            <rect x={x - 12 + 0} y="16" width="4" height="16" rx="2" fill={`url(#${id}b)`} />
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((c) =>
          [0, 1, 2].map((r) => (
            <rect key={`${c}${r}`} x={38 + c * 18} y={52 + r * 15} width="14" height="10" rx="1.5" fill={c === 2 && r === 1 ? `url(#${id}b)` : "none"} stroke={line} strokeWidth="1" />
          )),
        )}
      </g>
    ),
    // Пустые места за партами
    people: (
      <g filter={`url(#${id}s)`}>
        {[38, 80, 122].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="52" r="11" fill={i === 1 ? `url(#${id}b)` : "none"} stroke={i === 1 ? "var(--brass-dark)" : ink} strokeOpacity={i === 1 ? 1 : 0.55} strokeWidth="1.8" strokeDasharray={i === 1 ? "0" : "4 3"} />
            <path d={`M${x - 17} 92 Q${x - 17} 68 ${x} 68 Q${x + 17} 68 ${x + 17} 92Z`} fill={i === 1 ? paper : "none"} stroke={i === 1 ? "var(--brass-dark)" : ink} strokeOpacity={i === 1 ? 1 : 0.55} strokeWidth="1.8" strokeDasharray={i === 1 ? "0" : "4 3"} />
          </g>
        ))}
        <rect x="18" y="92" width="124" height="8" rx="3" fill={`url(#${id}w)`} />
      </g>
    ),
    // Лупа над листом
    search: (
      <g filter={`url(#${id}s)`}>
        <rect x="30" y="22" width="80" height="84" rx="4" fill={paper} stroke={line} strokeWidth="1.2" transform="rotate(-6 70 64)" />
        <g transform="rotate(-6 70 64)" stroke={line} strokeWidth="2" strokeLinecap="round">
          <path d="M42 40h44M42 52h56M42 64h36M42 76h48" />
        </g>
        <circle cx="98" cy="72" r="20" fill="#fff" fillOpacity="0.18" stroke={`url(#${id}b)`} strokeWidth="7" />
        <path d="M113 87l22 22" stroke={`url(#${id}l)`} strokeWidth="9" strokeLinecap="round" />
        <path d="M86 62a16 16 0 0 1 12-6" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    ),
    // Латунный колокольчик
    bell: (
      <g filter={`url(#${id}s)`}>
        <path d="M80 26c-19 0-30 15-30 34 0 16-6 22-12 30h84c-6-8-12-14-12-30 0-19-11-34-30-34z" fill={`url(#${id}b)`} stroke="var(--brass-dark)" strokeWidth="1.5" />
        <rect x="36" y="88" width="88" height="7" rx="3.5" fill={`url(#${id}b)`} stroke="var(--brass-dark)" strokeWidth="1.2" />
        <circle cx="80" cy="24" r="5" fill={`url(#${id}l)`} />
        <path d="M70 100q10 12 20 0z" fill={`url(#${id}l)`} />
        <ellipse cx="66" cy="50" rx="6" ry="16" fill="#fff" opacity="0.28" transform="rotate(12 66 50)" />
      </g>
    ),
    // Лоток для бумаг
    generic: (
      <g filter={`url(#${id}s)`}>
        <path d="M26 66h28l6 12h40l6-12h28v28H26z" fill={`url(#${id}w)`} />
        <path d="M26 66l14-30h80l14 30" fill={shade} stroke={line} strokeWidth="1.2" />
        <path d="M46 48h68M50 57h60" stroke={line} strokeWidth="2" strokeLinecap="round" />
        <rect x="26" y="84" width="108" height="10" fill={`url(#${id}l)`} />
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 160 120" className={className} role="presentation" aria-hidden focusable="false">
      {defs}
      {scenes[kind]}
    </svg>
  );
}
