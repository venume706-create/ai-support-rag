import Link from "next/link";
import { Avatar } from "@/components/common/avatar";
import { EmptyState } from "@/components/common/status-views";
import { tintClass } from "@/lib/appearance";
import { ru } from "@/lib/i18n/ru";
import type { LeaderboardRow } from "@/lib/student-insights";
import { nickOf } from "@/lib/person";
import { cn } from "@/lib/utils";
import { RankBadge } from "./medal";

const PODIUM = {
  1: { height: "h-24", step: "from-[#fff3bf] via-[#d9a93f] to-[#8a6420]", label: "text-[#3a2710]" },
  2: { height: "h-16", step: "from-[#fafafa] via-[#b6bfc9] to-[#77828f]", label: "text-[#20262d]" },
  3: { height: "h-12", step: "from-[#f0b98a] via-[#b7743f] to-[#6d4020]", label: "text-[#2b1508]" },
} as const;

/** Пьедестал: 2-е место слева, 1-е в центре, 3-е справа. */
function Podium({ rows, viewerId }: { rows: LeaderboardRow[]; viewerId?: string }) {
  const top = rows.slice(0, 3);
  // Порядок отображения: 2 · 1 · 3
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <ol className="flex items-end justify-center gap-2 sm:gap-4" data-testid="podium">
      {order.map((row) => {
        const step = PODIUM[Math.min(3, row.place) as 1 | 2 | 3];
        const me = row.studentId === viewerId;
        return (
          <li key={row.studentId} className="flex w-[30%] max-w-36 flex-col items-center text-center" data-place={row.place} data-testid="podium-place">
            <div className={cn("paper mb-2 flex w-full flex-col items-center gap-1 rounded-md px-1 py-2", tintClass(row.person.cardColor), me && "ring-2 ring-brass")}>
              <Avatar user={row.person} size="md" />
              <span className="w-full truncate text-sm font-bold" data-testid="board-nick">
                {nickOf(row.person)}
              </span>
              <span className="font-serif text-lg font-bold tabular-nums">{row.total.toFixed(1)}</span>
              {me && <span className="stamp stamp-green">{ru.insights.boardYou}</span>}
            </div>
            <div className={cn("flex w-full items-start justify-center rounded-t-md bg-gradient-to-b pt-1 shadow-[inset_0_2px_0_rgb(255_255_255/0.5),0_4px_6px_rgb(0_0_0/0.35)]", step.height, step.step)}>
              <span className={cn("handwritten text-3xl", step.label)}>{row.place}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Доска почёта группы: пьедестал и места 4–10. Показываются только ники и баллы.
 * Ученики, скрывшие себя в профиле, в доску не попадают.
 */
export function Leaderboard({
  rows,
  viewerId,
  viewerHidden = false,
  profileHref,
}: {
  rows: LeaderboardRow[];
  viewerId?: string;
  /** Зритель — ученик, скрытый из доски: подсказываем, где это изменить */
  viewerHidden?: boolean;
  profileHref?: string;
}) {
  if (rows.length === 0) return <EmptyState text={ru.insights.boardEmpty} />;
  const rest = rows.slice(3);
  return (
    <div className="grid gap-4" data-testid="leaderboard">
      <Podium rows={rows} viewerId={viewerId} />
      {rest.length > 0 && (
        <ol className="ruled -mx-1 overflow-hidden rounded-md" start={4}>
          {rest.map((row) => {
            const me = row.studentId === viewerId;
            return (
              <li key={row.studentId} className={cn("flex h-11 items-center gap-3 pr-3 pl-14", me && "bg-brass/20 font-bold")} data-testid="board-row">
                <span className="handwritten w-6 text-2xl text-ink-blue">{row.place}</span>
                <Avatar user={row.person} size="xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold" data-testid="board-nick">
                  {nickOf(row.person)}
                  {me && <span className="ml-2 text-xs font-normal text-ink-green">· {ru.insights.boardYou}</span>}
                </span>
                <RankBadge rank={row.rank.code} size={28} />
                <span className="w-12 text-right font-serif font-bold tabular-nums">{row.total.toFixed(1)}</span>
              </li>
            );
          })}
        </ol>
      )}
      {viewerHidden && (
        <p className="text-sm text-muted-foreground" data-testid="board-hidden">
          {ru.insights.boardHidden}{" "}
          {profileHref && (
            <Link href={profileHref} className="font-bold underline">
              {ru.profile.title}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
