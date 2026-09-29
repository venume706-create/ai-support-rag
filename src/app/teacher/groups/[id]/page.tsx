import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Pencil, Plus } from "lucide-react";
import type { AttendanceStatus, HomeworkStatus } from "@prisma/client";
import { DialogForm } from "@/components/admin/dialog-form";
import { PersonName } from "@/components/common/person-name";
import { Leaderboard } from "@/components/rating/leaderboard";
import { ListToolbar } from "@/components/common/list-toolbar";
import { Pagination } from "@/components/common/pagination";
import { RatingBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { PeriodSwitch } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { AttendanceStamps } from "@/components/teacher/attendance-stamps";
import { GradeInput } from "@/components/teacher/grade-input";
import { DeleteHomeworkButton } from "@/components/teacher/homework-buttons";
import { HomeworkForm } from "@/components/teacher/homework-form";
import { JournalGrid } from "@/components/teacher/journal-grid";
import { MarkAllPresent } from "@/components/teacher/mark-all";
import { SubmissionStamps } from "@/components/teacher/submission-stamps";
import { TopicForm } from "@/components/teacher/topic-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageUser } from "@/lib/access";
import { addDays, formatDate, formatWeekday, toDateOnly, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { ensureLessons } from "@/lib/lessons";
import { getGroupLeaderboard } from "@/lib/student-insights";
import { PERSON_SELECT, nickOf, realNameOf, type PersonLike } from "@/lib/person";
import { pageParam, searchAndPage } from "@/lib/pagination";
import { getStudentRatings } from "@/lib/rating-data";
import { cn } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.teacher.journal };

/** Ученик группы: ник — главное имя, person — для показа фото и имени */
export interface GroupStudent {
  id: string;
  name: string;
  search: string;
  person: PersonLike;
}

const TABS = ["journal", "students", "homework", "schedule"] as const;
type Tab = (typeof TABS)[number];
const GRID_LESSONS = 8;

export default async function TeacherGroupPage({ params, searchParams }: PageProps<"/teacher/groups/[id]">) {
  await requirePageUser("TEACHER");
  const { id } = await params;
  const sp = await searchParams;
  const { period, q } = parseListQuery(sp);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "journal";

  const now = today();
  await ensureLessons(db, [id], addDays(now, -30), addDays(now, 7));
  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      level: true,
      subject: { select: { name: true } },
      slots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      students: {
        orderBy: [{ student: { user: { nicknameKey: "asc" } } }, { student: { user: { fullName: "asc" } } }],
        select: { student: { select: { id: true, user: { select: PERSON_SELECT } } } },
      },
    },
  });
  if (!group) notFound();
  const students: GroupStudent[] = group.students.map((s) => ({
    id: s.student.id,
    name: nickOf(s.student.user),
    search: `${nickOf(s.student.user)} ${realNameOf(s.student.user)}`,
    person: s.student.user,
  }));
  const base = `/teacher/groups/${id}`;
  const tabHref = (t: Tab, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ ...(t === "journal" ? {} : { tab: t }), ...extra });
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  return (
    <>
      <PageHeader
        title={group.name}
        description={`${group.subject.name}${group.level ? ` · ${group.level}` : ""} · ${ru.teacher.studentsInGroup(students.length)}`}
        backHref="/teacher/groups"
        backLabel={ru.nav.myGroups}
      />
      <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" aria-label={ru.teacher.journal}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "key inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-bold",
              tab === t ? "key-brass" : "key-paper",
            )}
          >
            {ru.teacher.tabs[t]}
          </Link>
        ))}
      </nav>
      {tab === "journal" && <JournalTab groupId={id} students={students} selected={typeof sp.lesson === "string" ? sp.lesson : undefined} base={base} />}
      {tab === "students" && <StudentsTab groupId={id} students={students} period={period} base={base} q={q} page={pageParam(sp.sp)} />}
      {tab === "homework" && <HomeworkTab groupId={id} students={students} />}
      {tab === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle>{ru.teacher.groupSchedule}</CardTitle>
          </CardHeader>
          <CardContent>
            {group.slots.length === 0 ? (
              <EmptyState text={ru.empty.schedule} />
            ) : (
              <ul className="grid gap-2">
                {group.slots.map((s) => (
                  <li key={s.id} className="flex items-center justify-between border-b border-dotted border-border pb-2 last:border-0">
                    <span className="font-bold">{ru.common.weekdays[s.dayOfWeek - 1]}</span>
                    <span className="text-sm tabular-nums">
                      {s.startTime}–{s.endTime}
                      {s.room && ` · ${ru.common.room} ${s.room}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

async function JournalTab({
  groupId,
  students,
  selected,
  base,
}: {
  groupId: string;
  students: GroupStudent[];
  selected?: string;
  base: string;
}) {
  const now = today();
  const lessons = await db.lesson.findMany({
    where: { groupId, date: { gte: addDays(now, -30), lte: addDays(now, 7) } },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    select: { id: true, date: true, startTime: true, endTime: true, topic: true },
  });
  if (lessons.length === 0) return <EmptyState text={ru.teacher.noLessonsYet} />;
  const past = lessons.filter((l) => l.date <= now);
  const current = lessons.find((l) => l.id === selected) ?? past.find((l) => l.date.getTime() === now.getTime()) ?? past[0] ?? lessons[lessons.length - 1];
  const isFuture = current.date > now;

  const gridLessons = past.slice(0, GRID_LESSONS).reverse();
  const lessonIds = [...new Set([current.id, ...gridLessons.map((l) => l.id)])];
  const [attendance, grades] = await Promise.all([
    db.attendance.findMany({ where: { lessonId: { in: lessonIds } }, select: { lessonId: true, studentId: true, status: true } }),
    db.grade.findMany({ where: { lessonId: { in: lessonIds } }, orderBy: { createdAt: "asc" }, select: { id: true, lessonId: true, studentId: true, value: true, comment: true } }),
  ]);
  const key = (l: string, s: string) => `${l}|${s}`;
  const attMap = new Map<string, AttendanceStatus>(attendance.map((a) => [key(a.lessonId, a.studentId), a.status]));
  const gradeMap = new Map<string, number[]>();
  for (const g of grades) gradeMap.set(key(g.lessonId!, g.studentId), [...(gradeMap.get(key(g.lessonId!, g.studentId)) ?? []), g.value]);
  const lessonHref = (lessonId: string) => `${base}?lesson=${lessonId}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-2 md:mx-0 md:px-0" aria-label={ru.teacher.lessonsList} data-testid="lesson-strip">
        {[...lessons].reverse().map((l) => {
          const active = l.id === current.id;
          const todayLesson = l.date.getTime() === now.getTime();
          return (
            <Link
              key={l.id}
              href={lessonHref(l.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "key flex min-h-11 shrink-0 flex-col items-center justify-center rounded-md px-3 py-1.5 text-xs font-bold",
                active ? "key-brass" : "key-paper",
                l.date > now && !active && "opacity-60",
              )}
            >
              <span className="capitalize">{formatWeekday(l.date)}{todayLesson ? ` · ${ru.common.today}` : ""}</span>
              <span className="tabular-nums">
                {formatDate(l.date).slice(0, 5)} {l.startTime}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="ruled paper rounded-md py-4 pr-3 pl-14 sm:pr-5" data-testid="lesson-panel" data-lesson-id={current.id}>
        <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-serif text-lg font-bold">
              <CalendarClock className="size-5 text-brass-dark dark:text-brass" />
              {formatDate(current.date)} · {current.startTime}–{current.endTime}
            </p>
            <p className="text-xs text-muted-foreground">{ru.teacher.attendanceHint}</p>
          </div>
          {!isFuture && students.length > 0 && <MarkAllPresent lessonId={current.id} />}
        </header>
        <TopicForm key={current.id} lessonId={current.id} topic={current.topic} />
        {isFuture && <p className="stamp stamp-amber mt-3 w-full justify-start py-2 text-sm normal-case">{ru.teacher.futureLessonHint}</p>}
        {students.length === 0 ? (
          <EmptyState className="mt-4" text={ru.empty.groupStudents} />
        ) : (
          <ol className="mt-4 grid" data-testid="journal-rows">
            {students.map((s, i) => (
              <li key={`${current.id}-${s.id}`} className="grid gap-2 border-b border-paper-line py-3 md:grid-cols-[minmax(10rem,14rem)_1fr_minmax(12rem,1fr)] md:items-center md:gap-4">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 font-serif text-xs text-muted-foreground">{i + 1}.</span>
                  <PersonName user={s.person} avatar="sm" />
                </span>
                <AttendanceStamps lessonId={current.id} studentId={s.id} studentName={s.name} initial={attMap.get(key(current.id, s.id)) ?? null} disabled={isFuture} />
                <GradeInput
                  lessonId={current.id}
                  studentId={s.id}
                  studentName={s.name}
                  disabled={isFuture}
                  initial={grades.filter((g) => g.lessonId === current.id && g.studentId === s.id).map((g) => ({ id: g.id, value: g.value, comment: g.comment }))}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {gridLessons.length > 0 && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{ru.teacher.journalGrid}</CardTitle>
            <CardDescription>{ru.teacher.journalGridHint}</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-5">
            <JournalGrid lessons={gridLessons} students={students} attendance={attMap} grades={gradeMap} hrefFor={lessonHref} selectedId={current.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function StudentsTab({
  groupId,
  students: all,
  period,
  base,
  q,
  page,
}: {
  groupId: string;
  students: GroupStudent[];
  period: "month" | "all";
  base: string;
  q: string;
  page: number;
}) {
  const { info, rows: students } = searchAndPage(all, q, page, (s) => s.search);
  const board = await getGroupLeaderboard(groupId);
  const ratings = await getStudentRatings(students.map((s) => s.id), { period, groupIds: [groupId] });
  const hrefFor = (p: string) => (p === "all" ? `${base}?tab=students` : `${base}?tab=students&period=${p}`);
  return (
    <div className="grid gap-6">
    <Card data-testid="board-card">
      <CardHeader>
        <CardTitle>{ru.insights.boardTitle}</CardTitle>
        <CardDescription>{ru.insights.boardHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Leaderboard rows={board.rows} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{ru.teacher.studentsTitle}</CardTitle>
        <PeriodSwitch period={period} hrefFor={hrefFor} />
      </CardHeader>
      <CardContent>
        {all.length > 0 && (
          <ListToolbar pathname={base} q={q} hidden={{ tab: "students", ...(period === "month" ? { period } : {}) }} searchPlaceholder={ru.common.searchPlaceholder} />
        )}
        {students.length === 0 ? (
          <EmptyState text={q ? ru.empty.searchNothing : ru.empty.groupStudents} />
        ) : (
          <Table data-testid="teacher-group-students">
            <TableHeader>
              <TableRow>
                <TableHead>{ru.common.student}</TableHead>
                <TableHead className="hidden sm:table-cell">{ru.rating.grades}</TableHead>
                <TableHead className="hidden sm:table-cell">{ru.rating.attendance}</TableHead>
                <TableHead className="hidden sm:table-cell">{ru.rating.homework}</TableHead>
                <TableHead className="text-right">{ru.common.rating}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const r = ratings.get(s.id)!;
                const pts = (v: number | null, max: number) => (v === null ? ru.common.noData : ru.rating.points(v, max));
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/teacher/students/${s.id}`} className="hover:underline">
                        <PersonName user={s.person} avatar="sm" />
                      </Link>
                    </TableCell>
                    <TableCell label={ru.rating.grades} className="hidden text-sm sm:table-cell">{pts(r.grades.points, r.grades.max)}</TableCell>
                    <TableCell label={ru.rating.attendance} className="hidden text-sm sm:table-cell">{pts(r.attendance.points, r.attendance.max)}</TableCell>
                    <TableCell label={ru.rating.homework} className="hidden text-sm sm:table-cell">{pts(r.homework.points, r.homework.max)}</TableCell>
                    <TableCell label={ru.common.rating} className="text-right">
                      <RatingBadge value={r.total} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Pagination info={info} pathname={base} params={{ tab: "students", q, period: period === "month" ? period : undefined }} pageKey="sp" />
      </CardContent>
    </Card>
    </div>
  );
}

async function HomeworkTab({ groupId, students }: { groupId: string; students: GroupStudent[] }) {
  const homework = await db.homework.findMany({
    where: { groupId },
    orderBy: { dueDate: "desc" },
    select: { id: true, title: true, description: true, dueDate: true, submissions: { select: { studentId: true, status: true } } },
  });
  const now = today();
  const defaultDue = toDateOnly(addDays(now, 7));
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <DialogForm trigger={ru.teacher.homeworkNew} title={ru.teacher.homeworkNew} icon={<Plus />} testId="new-homework">
          <HomeworkForm groupId={groupId} defaultDue={defaultDue} />
        </DialogForm>
      </div>
      <div className="cork rounded-lg p-5 sm:p-7" data-testid="homework-board">
        {homework.length === 0 ? (
          <div className="paper mx-auto max-w-sm rounded-sm p-6 text-center">
            <p className="handwritten text-2xl text-muted-foreground">{ru.empty.homework}</p>
          </div>
        ) : (
          <ul className="grid gap-8 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {homework.map((h, i) => {
              const statusMap = new Map<string, HomeworkStatus>(h.submissions.map((s) => [s.studentId, s.status]));
              const done = h.submissions.filter((s) => s.status === "DONE").length;
              const overdue = h.dueDate < now;
              return (
                <li
                  key={h.id}
                  className="note paper relative rounded-sm p-4 pt-5"
                  style={{ "--tilt": `${[-1.5, 1, -0.5, 1.5, -1][i % 5]}deg` } as React.CSSProperties}
                  data-testid="homework-note"
                >
                  <span className="pin" aria-hidden />
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg leading-tight font-bold">{h.title}</h3>
                    <span className={cn("handwritten shrink-0 text-xl", overdue ? "text-ink-red" : "text-ink-blue")}>
                      {formatDate(h.dueDate).slice(0, 5)}
                    </span>
                  </div>
                  {h.description && <p className="mb-3 text-sm whitespace-pre-line">{h.description}</p>}
                  <details className="group border-t border-dotted border-border pt-2">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
                      {ru.teacher.submissions}: {done}/{students.length}
                    </summary>
                    <div className="mt-2 grid">
                      {students.map((s) => (
                        <SubmissionStamps key={s.id} homeworkId={h.id} studentId={s.id} studentName={s.name} initial={statusMap.get(s.id) ?? null} />
                      ))}
                    </div>
                  </details>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <DialogForm trigger={ru.common.edit} title={ru.common.edit} icon={<Pencil />} variant="outline">
                      <HomeworkForm
                        groupId={groupId}
                        defaultDue={defaultDue}
                        initial={{ id: h.id, title: h.title, description: h.description, dueDate: toDateOnly(h.dueDate) }}
                      />
                    </DialogForm>
                    <DeleteHomeworkButton id={h.id} title={h.title} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
