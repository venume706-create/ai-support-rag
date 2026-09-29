import { formatDate } from "@/lib/dates";
import { ACHIEVEMENT_CODES, type AchievementCode } from "@/lib/achievements";
import { ru } from "@/lib/i18n/ru";
import { AchievementMedal } from "./medal";

/** «Полка с наградами»: полученные — цветные, остальные — серые с подсказкой, как их получить. */
export function AchievementsShelf({ earned }: { earned: { code: string; earnedAt: Date; seen?: boolean }[] }) {
  const map = new Map(earned.map((e) => [e.code, e]));
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="achievements">
      {ACHIEVEMENT_CODES.map((code: AchievementCode) => {
        const got = map.get(code);
        const text = ru.achievements[code];
        return (
          <li
            key={code}
            className="flex flex-col items-center gap-1.5 rounded-md border border-dashed border-border p-3 text-center"
            data-achievement={code}
            data-earned={got ? "true" : "false"}
            data-new={got && got.seen === false ? "true" : "false"}
          >
            <AchievementMedal code={code} size={72} locked={!got} />
            <span className={got ? "text-sm leading-tight font-bold" : "text-sm leading-tight font-bold text-muted-foreground"}>{text.title}</span>
            <span className="text-xs leading-snug text-muted-foreground">{got ? formatDate(got.earnedAt) : text.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
