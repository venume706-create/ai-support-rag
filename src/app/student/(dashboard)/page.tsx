import type { Metadata } from "next";
import Link from "next/link";
import { Clock, DoorOpen } from "lucide-react";
import { GradeBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { RatingCard } from "@/components/common/rating-card";
import { TodayCard, type TodayData } from "@/components/student/today-card";
import { StudentRatingSections } from "@/components/rating/student-sections";
import { EmptyState } from "@/components/common/status-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { addDays, formatDate, formatDayMonth, formatWeekday, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { homeworkState } from "@/lib/homework-state";
import { ensureLessons } from "@/lib/lessons";
import { getStudentRating } from "@/lib/rating-data";
import { studentGroups } from "@/lib/student-data";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.student.dashboardTitle };

export default async function StudentDashboard({ searchParams }: PageProps<"/student">) {
  const user = await requirePageUser("STUDENT");
  const studentId = user.studentId ?? "__none__";
  const sp = await searchParams;
  const { period } = parseListQuery(sp);
  const groups = await studentGroups(user.studentId);
  const groupIds = groups.map((g) => g.id);
  const now = today();
  await ensureLessons(db, groupIds, now, addDays(now, 7));
  const [rating, upcoming, grades, slots] = await Promise.all([
    getStudentRating(studentId, { period }),
    db.lesson.findMany({
      where: { groupId: { in: groupIds }, date: { gte: now, lte: addDays(now, 7) } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 5,
      select: { id: true, date: true, startTime: true, endTime: true, topic: true, groupId: true },
    }),
    db.grade.findMany({
      where: { studentId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, date: true, value: true, comment: true, group: { select: { name: true } }, lesson: { select: { topic: true } } },
    }),
    db.scheduleSlot.findMany({ where: { groupId: { in: groupIds } }, select: { groupId: true, dayOfWeek: true, startTime: true, room: true } }),
  ]);
  const dow = now.getUTCDay() || 7;
  const [todayLessons, dueHomework, weekGrades] = await Promise.all([
    db.lesson.findMany({
      where: { groupId: { in: groupIds }, date: now },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, endTime: true, topic: true, groupId: true },
    }),
    db.homework.findMany({
      where: { groupId: { in: groupIds }, dueDate: { lte: addDays(now, 3) }, submissions: { none: { studentId, status: { in: ["DONE", "PARTIAL"] } } } },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: { id: true, title: true, dueDate: true, groupId: true, submissions: { where: { studentId }, select: { status: true } } },
    }),
    db.grade.findMany({
      where: { studentId, date: { gte: addDays(now, -6) } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, date: true, value: true, comment: true, group: { select: { name: true } } },
    }),
  ]);
  const todayData: TodayData = {
    lessons: todayLessons.map((l) => ({
      id: l.id,
      group: groups.find((g) => g.id === l.groupId)?.name ?? "",
      startTime: l.startTime,
      endTime: l.endTime,
      topic: l.topic,
      room: slots.find((s) => s.groupId === l.groupId && s.dayOfWeek === dow && s.startTime === l.startTime)?.room || undefined,
    })),
    // Только то, что ещё не сдано: просроченные не старше двух недель, сегодняшние и ближайшие (до 3 дней)
    homework: dueHomework
      .filter((h) => h.dueDate >= addDays(now, -14))
      .slice(0, 5)
      .map((h) => ({ id: h.id, title: h.title, group: groups.find((g) => g.id === h.groupId)?.name ?? "", ...homeworkState(h.dueDate, now, h.submissions[0]?.status) })),
    grades: weekGrades.map((g) => ({ id: g.id, value: g.value, group: g.group.name, date: g.date, comment: g.comment })),
  };
  const hrefFor = (p: string) => (p === "all" ? "/student" : `/student?period=${p}`);

  return (
    <>
      <PageHeader title={ru.student.dashboardTitle} description={`${user.nick} · ${groups.map((g) => g.name).join(", ") || ru.student.noGroups}`} />
      <div className="mb-6">
        <TodayCard data={todayData} />
      </div>
      <div className="mb-6">
        <RatingCard rating={rating} title={ru.student.myRating} period={period} hrefFor={hrefFor} />
      </div>
      <div className="mb-6">
        <StudentRatingSections studentId={studentId} view="student" pathname="/student" searchParams={sp} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{ru.student.upcomingLessons}</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/schedule">{ru.student.fullSchedule}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState kind="calendar" text={ru.empty.upcoming} />
            ) : (
              <ul className="grid gap-3" data-testid="upcoming-lessons">
                {upcoming.map((l) => {
                  const g = groups.find((x) => x.id === l.groupId)!;
                  const room = slots.find((s) => s.groupId === l.groupId && s.dayOfWeek === (l.date.getUTCDay() || 7) && s.startTime === l.startTime)?.room;
                  const isToday = l.date.getTime() === now.getTime();
                  return (
                    <li key={l.id} className="flex items-center gap-4 border-b border-dotted border-border pb-3 last:border-0">
                      <div className="w-16 shrink-0 text-center">
                        <p className="text-xs font-bold text-muted-foreground uppercase">{isToday ? ru.common.today : formatWeekday(l.date)}</p>
                        <p className="handwritten text-2xl text-ink-blue">{formatDayMonth(l.date).split(" ")[0]}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif font-bold">{g.name}</p>
                        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock className="size-3.5" /> {l.startTime}–{l.endTime}
                          </span>
                          {room && (
                            <span className="flex items-center gap-1">
                              <DoorOpen className="size-3.5" /> {room}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{ru.student.recentGrades}</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/grades">{ru.student.allGradesLink}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <EmptyState kind="star" text={ru.empty.grades} />
            ) : (
              <ul className="grid gap-2" data-testid="recent-grades">
                {grades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 border-b border-dotted border-border pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="font-bold">{g.group.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(g.date)}
                        {g.lesson?.topic && ` · ${g.lesson.topic}`}
                        {g.comment && ` · ${g.comment}`}
                      </p>
                    </div>
                    <GradeBadge value={g.value} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
