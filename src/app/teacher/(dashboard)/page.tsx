import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, DoorOpen } from "lucide-react";
import { RatingBadge } from "@/components/common/badges";
import { Gauge } from "@/components/common/gauge";
import { PageHeader } from "@/components/common/page-header";
import { PeriodSwitch, ratingTextClass } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { formatDayMonth, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { ensureLessons } from "@/lib/lessons";
import { calculateTeacherRating } from "@/lib/rating";
import { getStudentRatings, getTeacherRatings } from "@/lib/rating-data";
import { cn } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.teacher.dashboardTitle };

export default async function TeacherDashboard({ searchParams }: PageProps<"/teacher">) {
  const user = await requirePageUser("TEACHER");
  const { period } = parseListQuery(await searchParams);
  const now = today();
  const groups = await db.group.findMany({
    where: { teacherId: user.teacherId ?? "__none__" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      level: true,
      subject: { select: { name: true } },
      students: { select: { studentId: true } },
      slots: { select: { dayOfWeek: true, startTime: true, room: true } },
    },
  });
  const groupIds = groups.map((g) => g.id);
  await ensureLessons(db, groupIds, now, now);
  const lessons = await db.lesson.findMany({
    where: { groupId: { in: groupIds }, date: now },
    orderBy: { startTime: "asc" },
    select: { id: true, startTime: true, endTime: true, topic: true, groupId: true, _count: { select: { attendance: true } } },
  });
  const [ratingRow] = user.teacherId ? await getTeacherRatings(period, [user.teacherId]) : [];
  const groupRatings = new Map<string, number | null>();
  for (const g of groups) {
    const r = await getStudentRatings(g.students.map((s) => s.studentId), { period, groupIds: [g.id] });
    groupRatings.set(g.id, calculateTeacherRating([...r.values()].map((x) => x.total)).rating);
  }
  const hrefFor = (p: string) => (p === "all" ? "/teacher" : `/teacher?period=${p}`);
  const dow = now.getUTCDay() || 7;

  return (
    <>
      <PageHeader title={ru.teacher.dashboardTitle} description={`${user.fullName} · ${formatDayMonth(now)}`} />
      <div className="mb-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{ru.teacher.todayLessons}</CardTitle>
            <CardDescription>{formatDayMonth(now)}</CardDescription>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <EmptyState text={ru.empty.lessonsToday} />
            ) : (
              <ul className="grid gap-3" data-testid="today-lessons">
                {lessons.map((l) => {
                  const g = groups.find((x) => x.id === l.groupId)!;
                  const room = g.slots.find((s) => s.dayOfWeek === dow && s.startTime === l.startTime)?.room;
                  return (
                    <li key={l.id} className="flex flex-col gap-3 border-b border-dotted border-border pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-bold tabular-nums">
                          <Clock className="size-4" /> {l.startTime}–{l.endTime}
                          {room && (
                            <span className="flex items-center gap-1 font-normal text-muted-foreground">
                              <DoorOpen className="size-4" /> {room}
                            </span>
                          )}
                        </p>
                        <p className="font-serif text-lg font-bold">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.subject.name} · {ru.teacher.studentsInGroup(g.students.length)}
                          {l.topic && ` · ${l.topic}`}
                        </p>
                      </div>
                      <Button asChild>
                        <Link href={`/teacher/groups/${g.id}?lesson=${l.id}`}>
                          <BookOpen /> {ru.teacher.openLesson}
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card data-testid="teacher-rating">
          <CardHeader className="gap-3">
            <CardTitle>{ru.teacher.myRating}</CardTitle>
            <CardDescription>{ru.rating.teacherRatingHint}</CardDescription>
            <PeriodSwitch period={period} hrefFor={hrefFor} />
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Gauge value={ratingRow?.rating ?? null} label={ru.teacher.myRating} />
            <span className={cn("-mt-1 font-serif text-4xl font-bold tabular-nums", ratingTextClass(ratingRow?.rating ?? null))}>
              {ratingRow?.rating == null ? ru.common.noData : ratingRow.rating.toFixed(1)}
            </span>
          </CardContent>
        </Card>
      </div>
      <h2 className="mb-3 font-serif text-xl font-bold text-on-wood">{ru.teacher.myGroups}</h2>
      {groups.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState text={ru.teacher.noGroups} />
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="my-groups">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/teacher/groups/${g.id}`} className="paper block rounded-md p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-lg font-bold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.subject.name}
                      {g.level && ` · ${g.level}`}
                    </p>
                  </div>
                  <RatingBadge value={groupRatings.get(g.id) ?? null} />
                </div>
                <p className="mt-3 text-sm">{ru.teacher.studentsInGroup(g.students.length)}</p>
                <p className="text-xs text-muted-foreground">
                  {g.slots
                    .slice()
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((s) => `${ru.common.weekdaysShort[s.dayOfWeek - 1]} ${s.startTime}`)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
