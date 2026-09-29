import { useId } from "react";
import { Award, BookCheck, BookOpen, CalendarCheck, Crown, Flame, Gem, ListChecks, Lock, Rocket, ShieldCheck, Sprout, Star, TrendingUp, Trophy } from "lucide-react";
import type { AchievementCode } from "@/lib/achievements";
import type { RankCode } from "@/lib/ranks";

type IconType = React.ComponentType<{ x?: number; y?: number; width?: number; height?: number; color?: string; strokeWidth?: number }>;

interface Palette {
  ring: [string, string, string]; // свет → середина → тень
  disc: [string, string];
  icon: string;
  glow?: string;
}

/** Материалы рангов: бронза → медь → серебро → золото → изумруд → королевский пурпур. */
const RANK_STYLE: Record<RankCode, { icon: IconType; palette: Palette }> = {
  novice: { icon: Sprout, palette: { ring: ["#d9a878", "#a56a45", "#5a3a22"], disc: ["#f6ead0", "#e3cfa6"], icon: "#3f7a3a" } },
  student: { icon: BookOpen, palette: { ring: ["#f0b98a", "#c17a44", "#7a4a26"], disc: ["#f6ead0", "#e3cfa6"], icon: "#7a3f1f" } },
  advanced: { icon: Rocket, palette: { ring: ["#fafafa", "#b6bfc9", "#77828f"], disc: ["#eef3f8", "#cfd8e3"], icon: "#2f5d94" } },
  honor: { icon: Award, palette: { ring: ["#fff3bf", "#d9a93f", "#8a6420"], disc: ["#fff8dc", "#f1dc9a"], icon: "#8a4a00" } },
  master: { icon: Gem, palette: { ring: ["#fff3bf", "#d9a93f", "#8a6420"], disc: ["#3aa57a", "#0f5a3f"], icon: "#f6fff9", glow: "#3aa57a" } },
  legend: { icon: Crown, palette: { ring: ["#fff3bf", "#e0b548", "#8a6420"], disc: ["#7a3fa6", "#2b1140"], icon: "#ffe08a", glow: "#b07af0" } },
};

const ACHIEVEMENT_STYLE: Record<AchievementCode, { icon: IconType; palette: Palette }> = {
  first_five: { icon: Star, palette: { ring: ["#fff3bf", "#d9a93f", "#8a6420"], disc: ["#fff8dc", "#f1dc9a"], icon: "#b8620a" } },
  five_streak: { icon: Flame, palette: { ring: ["#ffd2a8", "#e0763a", "#8a3a12"], disc: ["#fff0e0", "#f5c9a0"], icon: "#c2410c" } },
  no_absence_month: { icon: CalendarCheck, palette: { ring: ["#c8e6d0", "#4f9a6a", "#1f5a3a"], disc: ["#effaf1", "#c9e8d2"], icon: "#1f6b3a" } },
  perfect_attendance: { icon: ShieldCheck, palette: { ring: ["#cfe0f5", "#5c86c0", "#25497f"], disc: ["#eef4fc", "#c9daf0"], icon: "#1f4a8a" } },
  homework_all: { icon: BookCheck, palette: { ring: ["#e3d3f5", "#9067c4", "#4b2a80"], disc: ["#f6effc", "#dccbf0"], icon: "#5a2a9a" } },
  homework_three: { icon: ListChecks, palette: { ring: ["#f5d3e3", "#c4678f", "#7a2a50"], disc: ["#fcf0f6", "#f0cbdc"], icon: "#9a2a5a" } },
  podium: { icon: Trophy, palette: { ring: ["#fff3bf", "#e0b548", "#8a6420"], disc: ["#fff8dc", "#f1dc9a"], icon: "#8a5a00", glow: "#e0b548" } },
  rising_star: { icon: TrendingUp, palette: { ring: ["#c8ecf0", "#4aa0b0", "#1f5a66"], disc: ["#eefbfc", "#c6e8ee"], icon: "#0e6a7a" } },
};

/** Объёмный значок-медаль: металлический ободок с бликом, «вдавленный» диск и иконка. */
function Medal({ icon: Icon, palette, size, locked = false, label }: { icon: IconType; palette: Palette; size: number; locked?: boolean; label?: string }) {
  const id = useId().replace(/:/g, "");
  const p: Palette = locked ? { ring: ["#d8d2c4", "#a8a293", "#6e695c"], disc: ["#e6e1d4", "#cfc9b9"], icon: "#8b857a" } : palette;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={p.glow && !locked ? { filter: `drop-shadow(0 0 6px ${p.glow}99)` } : undefined}>
      <defs>
        <linearGradient id={`${id}r`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={p.ring[0]} />
          <stop offset="0.5" stopColor={p.ring[1]} />
          <stop offset="1" stopColor={p.ring[2]} />
        </linearGradient>
        <radialGradient id={`${id}d`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={p.disc[0]} />
          <stop offset="1" stopColor={p.disc[1]} />
        </radialGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill="rgb(0 0 0 / 0.25)" />
      <circle cx="50" cy="50" r="46" fill={`url(#${id}r)`} stroke={p.ring[2]} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="46" fill={`url(#${id}s)`} />
      {/* Рифлёный край */}
      <circle cx="50" cy="50" r="41.5" fill="none" stroke={p.ring[2]} strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="1.6 2.6" />
      <circle cx="50" cy="50" r="36" fill={`url(#${id}d)`} stroke={p.ring[2]} strokeOpacity="0.7" strokeWidth="1.5" />
      <ellipse cx="42" cy="34" rx="16" ry="8" fill="#fff" fillOpacity="0.28" transform="rotate(-25 42 34)" />
      {locked ? <Lock x={34} y={34} width={32} height={32} color={p.icon} strokeWidth={2} /> : <Icon x={31} y={31} width={38} height={38} color={p.icon} strokeWidth={2.1} />}
    </svg>
  );
}

export function RankBadge({ rank, size = 96, label }: { rank: RankCode; size?: number; label?: string }) {
  const s = RANK_STYLE[rank];
  return <Medal icon={s.icon} palette={s.palette} size={size} label={label} />;
}

export function AchievementMedal({ code, size = 72, locked = false, label }: { code: AchievementCode; size?: number; locked?: boolean; label?: string }) {
  const s = ACHIEVEMENT_STYLE[code];
  return <Medal icon={s.icon} palette={s.palette} size={size} locked={locked} label={label} />;
}
