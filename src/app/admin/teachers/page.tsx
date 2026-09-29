import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TeacherForm } from "@/components/admin/teacher-form";
import { DialogForm } from "@/components/admin/dialog-form";
import { ActiveBadge, RatingBadge } from "@/components/common/badges";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { PersonName } from "@/components/common/person-name";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { PERSON_SELECT, nickOf } from "@/lib/person";
import { searchTerm } from "@/lib/utils";
import { getTeacherRatings } from "@/lib/rating-data";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.teachersTitle };

export default async function TeachersPage({ searchParams }: PageProps<"/admin/teachers">) {
  const query = parseListQuery(await searchParams);
  const subjects = await db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const teachers = await db.teacher.findMany({
    where: {
      subjects: query.subjectId ? { some: { id: query.subjectId } } : undefined,
      user: {
        isActive: query.status === "active" ? true : query.status === "inactive" ? false : undefined,
        searchKey: query.q ? { contains: searchTerm(query.q) } : undefined,
      },
    },
    select: {
      id: true,
      user: { select: { ...PERSON_SELECT, isActive: true } },
      subjects: { select: { name: true } },
      _count: { select: { groups: true } },
    },
  });
  const ratings = new Map((await getTeacherRatings(query.period, teachers.map((t) => t.id))).map((r) => [r.teacherId, r]));
  const rows = teachers
    .map((t) => ({ ...t, rating: ratings.get(t.id)?.rating ?? null }))
    .sort((a, b) =>
      query.sort === "name" ? nickOf(a.user).localeCompare(nickOf(b.user), "ru") : (b.rating ?? -1) - (a.rating ?? -1),
    );
  const info = paginate(rows.length, query.page);
  const pageRows = rows.slice(info.skip, info.skip + info.take);
  const params = { q: query.q, subjectId: query.subjectId, status: query.status, sort: query.sort === "rating" ? "" : query.sort };

  return (
    <>
      <PageHeader
        title={ru.admin.teachersTitle}
        description={`${ru.common.total}: ${rows.length}`}
        actions={
          <DialogForm trigger={ru.admin.teacherNew} title={ru.admin.teacherNew} icon={<Plus />} testId="new-teacher">
            <TeacherForm subjects={subjects} />
          </DialogForm>
        }
      />
      <ListToolbar
        pathname="/admin/teachers"
        q={query.q}
        filters={[
          { name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
          {
            name: "status",
            value: query.status,
            allLabel: ru.admin.allStatuses,
            options: [
              { value: "active", label: ru.common.active },
              { value: "inactive", label: ru.common.inactive },
            ],
          },
          {
            name: "sort",
            value: query.sort === "rating" ? "" : query.sort,
            allLabel: ru.admin.sortByRating,
            options: [{ value: "name", label: ru.admin.sortByName }],
          },
        ]}
      />
      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          {pageRows.length === 0 ? (
            <EmptyState className="my-3" text={query.q || query.subjectId || query.status ? ru.empty.searchNothing : ru.empty.teachers} />
          ) : (
            <Table data-testid="teachers-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{ru.common.teacher}</TableHead>
                  <TableHead className="hidden md:table-cell">{ru.common.subjects}</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">{ru.admin.groupsCount}</TableHead>
                  <TableHead className="hidden sm:table-cell">{ru.common.status}</TableHead>
                  <TableHead className="text-right">{ru.common.rating}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/admin/teachers/${t.id}`} className="hover:underline">
                        <PersonName user={t.user} avatar="sm" />
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ru.admin.login}: {t.user.login}
                        <span className="md:hidden"> · {t.subjects.map((s) => s.name).join(", ")}</span>
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{t.subjects.map((s) => s.name).join(", ")}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center tabular-nums">{t._count.groups}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <ActiveBadge active={t.user.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RatingBadge value={t.rating} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination info={info} pathname="/admin/teachers" params={params} />
        </CardContent>
      </Card>
    </>
  );
}
