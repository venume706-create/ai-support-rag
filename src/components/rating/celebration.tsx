"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { acknowledgeCelebrations } from "@/app/actions/profile";
import type { AchievementCode } from "@/lib/achievements";
import { ru } from "@/lib/i18n/ru";
import type { RankCode } from "@/lib/ranks";
import { Confetti } from "./confetti";
import { AchievementMedal, RankBadge } from "./medal";

/**
 * Поздравление: новый ранг и/или новые награды + конфетти. Показывается один раз:
 * после показа сервер помечает награды просмотренными и запоминает ранг.
 */
export function Celebration({ rank, achievements }: { rank: RankCode | null; achievements: AchievementCode[] }) {
  const [open, setOpen] = useState(true);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void acknowledgeCelebrations();
  }, []);

  if (!open) return null;
  return (
    <>
      <Confetti />
      <section
        role="status"
        aria-live="polite"
        className="banner-in paper relative mb-6 flex flex-col items-center gap-3 rounded-md border-2 border-brass p-5 text-center sm:flex-row sm:text-left"
        data-testid="celebration"
        data-rank={rank ?? ""}
        data-achievements={achievements.join(",")}
      >
        <PartyPopper className="size-8 shrink-0 text-brass-dark dark:text-brass" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-2xl font-bold">{ru.insights.celebrate}</p>
          {rank && (
            <p className="mt-1 flex items-center justify-center gap-3 font-bold sm:justify-start" data-testid="celebration-rank">
              <RankBadge rank={rank} size={56} />
              {ru.insights.newRank(ru.ranks[rank])}
            </p>
          )}
          {achievements.map((code) => (
            <p key={code} className="mt-2 flex items-center justify-center gap-3 sm:justify-start" data-testid="celebration-achievement">
              <span className="medal-pop inline-flex">
                <AchievementMedal code={code} size={56} />
              </span>
              <span>
                <span className="block text-xs font-bold tracking-wide text-ink-green uppercase">{ru.insights.achNew}</span>
                <span className="font-bold">{ru.achievements[code].title}</span>
              </span>
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={ru.common.close}
          className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-md hover:bg-black/10"
        >
          <X className="size-5" />
        </button>
      </section>
    </>
  );
}
