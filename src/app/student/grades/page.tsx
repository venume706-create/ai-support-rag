import type { Metadata } from "next";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { GradeBars } from "@/components/rating/charts";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { gradeCounts } from "@/lib/trends";
import { studentGroups } from "@/lib/student-data";
import { cn, searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.student.gradesTitle };

export default async function StudentGradesPage({ searchParams }: PageProps<"/student/grades">) {
  const user = await requirePageUser("STUDENT");
  const query = parseListQuery(await searchParams);
  const groups = await studentGroups(user.studentId);
  const subjects = [...new Map(groups.map((g) => [g.subject.id, g.subject])).values()];
  const all = await db.grade.findMany({
    where: {
      studentId: user.studentId ?? "__none__",
      groupId: query.groupId || undefined,
      group: query.subjectId ? { subjectId: query.subjectId } : undefined,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { id: true, date: true, value: true, comment: true, groupId: true, group: { select: { name: true } }, lesson: { select: { topic: true } } },
  });
  const term = searchTerm(query.q);
  const grades = term ? all.filter((g) => searchTerm(`${g.lesson?.topic ?? ""} ${g.comment} ${g.group.name}`).includes(term)) : all;
  const info = paginate(grades.length, query.page, 15);
  const rows = grades.slice(info.skip, info.skip + info.take);
  const averages = groups
    .map((g) => {
      const values = all.filter((x) => x.groupId === g.id).map((x) => x.value);
      return { ...g, count: values.length, avg: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null };
    })
    .filter((g) => !query.groupId || g.id === query.groupId);

  return (
    <>
      <PageHeader title={ru.student.gradesTitle} description={`${ru.common.total}: ${grades.length}`} />
      <ListToolbar
        pathname="/student/grades"
        q={query.q}
        searchPlaceholder={ru.student.searchGrades}
        filters={[
          { name: "groupId", value: query.groupId, allLabel: ru.common.allGroups, options: groups.map((g) => ({ value: g.id, label: g.name })) },
          { name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
        ]}
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{ru.charts.gradesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <GradeBars counts={gradeCounts(all.map((g) => g.value))} />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="py-2">
          <CardContent className="px-2 sm:px-4">
            {rows.length === 0 ? (
              <EmptyState kind={query.q || query.groupId || query.subjectId ? "search" : "star"} className="my-3" text={query.q || query.groupId || query.subjectId ? ru.empty.searchNothing : ru.empty.grades} />
            ) : (
              <ol className="ruled -mx-2 rounded-md sm:-mx-4" data-testid="student-grades">
                {rows.map((g) => (
                  <li key={g.id} className="flex h-11 items-center gap-3 pr-3 pl-14">
                    <span className="w-20 shrink-0 text-sm tabular-nums">{formatDate(g.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-bold">{g.group.name}</span>
                      {(g.lesson?.topic || g.comment) && <span className="text-muted-foreground"> · {[g.lesson?.topic, g.comment].filter(Boolean).join(" · ")}</span>}
                    </span>
                    <span className={cn("handwritten w-8 text-center text-3xl", g.value >= 4 ? "text-ink-red" : "text-ink-blue")} data-grade={g.value}>
                      {g.value}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <Pagination info={info} pathname="/student/grades" params={{ q: query.q, groupId: query.groupId, subjectId: query.subjectId }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.student.averageByGroup}</CardTitle>
          </CardHeader>
          <CardContent>
            {averages.length === 0 ? (
              <EmptyState kind="people" text={ru.student.noGroups} />
            ) : (
              <ul className="grid gap-3">
                {averages.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 border-b border-dotted border-border pb-2 last:border-0">
                    <div>
                      <p className="font-bold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{ru.rating.gradesCounted(g.count)}</p>
                    </div>
                    <span className="handwritten text-3xl text-ink-red">{g.avg === null ? ru.common.dash : g.avg.toFixed(2)}</span>
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
