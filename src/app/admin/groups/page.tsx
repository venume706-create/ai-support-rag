import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DialogForm } from "@/components/admin/dialog-form";
import { GroupForm } from "@/components/admin/group-form";
import { SubjectsManager } from "@/components/admin/subjects-manager";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { PersonName } from "@/components/common/person-name";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { PERSON_SELECT, nickOf } from "@/lib/person";
import { searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.groupsTitle };

export default async function GroupsPage({ searchParams }: PageProps<"/admin/groups">) {
  const query = parseListQuery(await searchParams);
  const [subjects, teachers, allGroups] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { groups: true } } } }),
    db.teacher.findMany({
      orderBy: [{ user: { nicknameKey: "asc" } }, { user: { fullName: "asc" } }],
      select: { id: true, user: { select: { nickname: true, login: true } }, subjects: { select: { id: true } } },
    }),
    db.group.findMany({
      where: { subjectId: query.subjectId || undefined, teacherId: query.teacherId || undefined },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        level: true,
        subject: { select: { name: true } },
        teacher: { select: { id: true, user: { select: PERSON_SELECT } } },
        _count: { select: { students: true, slots: true } },
      },
    }),
  ]);
  // Названия групп короткие и их немного — поиск без учёта регистра выполняем в памяти
  const term = searchTerm(query.q);
  const groups = term ? allGroups.filter((g) => searchTerm(`${g.name} ${g.level}`).includes(term)) : allGroups;
  const info = paginate(groups.length, query.page);
  const rows = groups.slice(info.skip, info.skip + info.take);
  const teacherOptions = teachers.map((t) => ({ id: t.id, name: nickOf(t.user), subjectIds: t.subjects.map((s) => s.id) }));
  const params = { q: query.q, subjectId: query.subjectId, teacherId: query.teacherId };

  return (
    <>
      <PageHeader
        title={ru.admin.groupsTitle}
        description={`${ru.common.total}: ${groups.length}`}
        actions={
          <DialogForm trigger={ru.admin.groupNew} title={ru.admin.groupNew} icon={<Plus />} testId="new-group">
            <GroupForm subjects={subjects} teachers={teacherOptions} />
          </DialogForm>
        }
      />
      <ListToolbar
        pathname="/admin/groups"
        q={query.q}
        searchPlaceholder={ru.common.search}
        filters={[
          { name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
          { name: "teacherId", value: query.teacherId, allLabel: ru.admin.filterTeacher, options: teachers.map((t) => ({ value: t.id, label: nickOf(t.user) })) },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="py-2">
          <CardContent className="px-2 sm:px-4">
            {rows.length === 0 ? (
              <EmptyState kind={query.q || query.subjectId || query.teacherId ? "search" : "people"} className="my-3" text={query.q || query.subjectId || query.teacherId ? ru.empty.searchNothing : ru.empty.groups} />
            ) : (
              <Table data-testid="groups-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.group}</TableHead>
                    <TableHead className="hidden sm:table-cell">{ru.common.teacher}</TableHead>
                    <TableHead className="text-center">{ru.admin.studentsCount}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Link href={`/admin/groups/${g.id}`} className="font-bold hover:underline">
                          {g.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {g.subject.name}
                          {g.level && ` · ${g.level}`}
                        </p>
                      </TableCell>
                      <TableCell label={ru.common.teacher} className="hidden sm:table-cell">
                        {g.teacher ? (
                          <Link href={`/admin/teachers/${g.teacher.id}`} className="hover:underline">
                            <PersonName user={g.teacher.user} avatar="xs" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{ru.common.notAssigned}</span>
                        )}
                      </TableCell>
                      <TableCell label={ru.admin.studentsCount} className="text-center tabular-nums">{g._count.students}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pagination info={info} pathname="/admin/groups" params={params} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.manageSubjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectsManager subjects={subjects.map((s) => ({ id: s.id, name: s.name, groups: s._count.groups }))} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
