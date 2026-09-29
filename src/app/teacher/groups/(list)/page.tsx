import type { Metadata } from "next";
import Link from "next/link";
import { RatingBadge } from "@/components/common/badges";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageUser } from "@/lib/access";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { calculateTeacherRating } from "@/lib/rating";
import { getStudentRatings } from "@/lib/rating-data";
import { searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.nav.myGroups };

export default async function TeacherGroupsPage({ searchParams }: PageProps<"/teacher/groups">) {
  const user = await requirePageUser("TEACHER");
  const query = parseListQuery(await searchParams);
  const all = await db.group.findMany({
    where: { teacherId: user.teacherId ?? "__none__", subjectId: query.subjectId || undefined },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true, subject: { select: { id: true, name: true } }, students: { select: { studentId: true } } },
  });
  const subjects = [...new Map(all.map((g) => [g.subject.id, g.subject])).values()];
  const term = searchTerm(query.q);
  const groups = term ? all.filter((g) => searchTerm(`${g.name} ${g.level}`).includes(term)) : all;
  const info = paginate(groups.length, query.page);
  const rows = groups.slice(info.skip, info.skip + info.take);
  const ratings = new Map<string, number | null>();
  for (const g of rows) {
    const r = await getStudentRatings(g.students.map((s) => s.studentId), { period: query.period, groupIds: [g.id] });
    ratings.set(g.id, calculateTeacherRating([...r.values()].map((x) => x.total)).rating);
  }

  return (
    <>
      <PageHeader title={ru.nav.myGroups} description={`${ru.common.total}: ${groups.length}`} />
      <ListToolbar
        pathname="/teacher/groups"
        q={query.q}
        searchPlaceholder={ru.common.search}
        filters={[{ name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) }]}
      />
      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          {rows.length === 0 ? (
            <EmptyState kind={query.q || query.subjectId ? "search" : "people"} className="my-3" text={query.q || query.subjectId ? ru.empty.searchNothing : ru.teacher.noGroups} />
          ) : (
            <Table data-testid="teacher-groups">
              <TableHeader>
                <TableRow>
                  <TableHead>{ru.common.group}</TableHead>
                  <TableHead className="text-center">{ru.admin.studentsCount}</TableHead>
                  <TableHead className="text-right">{ru.teacher.groupRating}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Link href={`/teacher/groups/${g.id}`} className="font-bold hover:underline">
                        {g.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {g.subject.name}
                        {g.level && ` · ${g.level}`}
                      </p>
                    </TableCell>
                    <TableCell label={ru.admin.studentsCount} className="text-center tabular-nums">{g.students.length}</TableCell>
                    <TableCell label={ru.teacher.groupRating} className="text-right">
                      <RatingBadge value={ratings.get(g.id) ?? null} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination info={info} pathname="/teacher/groups" params={{ q: query.q, subjectId: query.subjectId }} />
        </CardContent>
      </Card>
    </>
  );
}
