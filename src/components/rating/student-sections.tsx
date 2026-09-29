import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { getGroupLeaderboard, getStudentInsights, syncAchievements } from "@/lib/student-insights";
import { withParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { AchievementsShelf } from "./achievements-shelf";
import { Leaderboard } from "./leaderboard";
import { RatingInsights } from "./rating-insights";

/**
 * Рейтинг ученика «в развитии»: ранг, динамика, график, места, подсказки, доска почёта его групп и награды.
 * view="student" — собственный кабинет (с подсказками и выдачей новых наград);
 * view="staff" — для учителя и админа: ранг, динамика, график и награды (доска — на страницах групп).
 */
export async function StudentRatingSections({
  studentId,
  view,
  pathname,
  searchParams = {},
  groupIds,
}: {
  studentId: string;
  view: "student" | "staff";
  /** Ограничить данные группами (для учителя — только его группы) */
  groupIds?: string[];
  pathname: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (view === "student") await syncAchievements(studentId);
  const [insights, achievements] = await Promise.all([
    getStudentInsights(studentId, groupIds),
    db.studentAchievement.findMany({ where: { studentId }, orderBy: { earnedAt: "asc" }, select: { code: true, earnedAt: true, seen: true } }),
  ]);

  let board: React.ReactNode = null;
  if (view === "student") {
    const memberships = await db.groupStudent.findMany({
      where: { studentId },
      orderBy: { group: { name: "asc" } },
      select: { group: { select: { id: true, name: true } }, student: { select: { showInLeaderboard: true } } },
    });
    if (memberships.length > 0) {
      const wanted = typeof searchParams.board === "string" ? searchParams.board : "";
      const current = memberships.find((m) => m.group.id === wanted) ?? memberships[0];
      const { rows } = await getGroupLeaderboard(current.group.id);
      const flat = Object.fromEntries(Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
      board = (
        <Card data-testid="board-card">
          <CardHeader>
            <CardTitle>{ru.insights.boardTitle}</CardTitle>
            <CardDescription>{ru.insights.boardHint}</CardDescription>
            {memberships.length > 1 && (
              <nav className="mt-2 flex flex-wrap gap-2" aria-label={ru.insights.boardGroup}>
                {memberships.map((m) => (
                  <Link
                    key={m.group.id}
                    href={`${withParams(pathname, flat, { board: m.group.id })}#board`}
                    scroll={false}
                    aria-current={m.group.id === current.group.id ? "true" : undefined}
                    className={cn("key inline-flex min-h-11 items-center rounded-md px-3 text-sm font-bold", m.group.id === current.group.id ? "key-brass" : "key-paper")}
                  >
                    {m.group.name}
                  </Link>
                ))}
              </nav>
            )}
          </CardHeader>
          <CardContent id="board">
            {memberships.length === 1 && <p className="mb-3 text-sm font-bold">{current.group.name}</p>}
            <Leaderboard rows={rows} viewerId={studentId} viewerHidden={!current.student.showInLeaderboard} profileHref="/profile" />
          </CardContent>
        </Card>
      );
    }
  }

  return (
    <div className="grid gap-6">
      <RatingInsights insights={insights} view={view} />
      {board}
      <Card data-testid="achievements-card">
        <CardHeader>
          <CardTitle>{view === "student" ? ru.insights.achTitle : ru.insights.achTitleStaff}</CardTitle>
          <CardDescription>{ru.insights.achCount(achievements.length, 8)}</CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementsShelf earned={achievements} />
        </CardContent>
      </Card>
    </div>
  );
}
