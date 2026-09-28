import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DialogForm } from "@/components/admin/dialog-form";
import { StudentForm } from "@/components/admin/student-form";
import { ActiveBadge, RatingBadge } from "@/components/common/badges";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { getStudentRatings } from "@/lib/rating-data";
import { searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.studentsTitle };

export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const query = parseListQuery(await searchParams);
  const [subjects, groups] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const where = {
    user: {
      searchKey: query.q ? { contains: searchTerm(query.q) } : undefined,
      isActive: query.status === "active" ? true : query.status === "inactive" ? false : undefined,
    },
    groups:
      query.groupId || query.subjectId
        ? { some: { groupId: query.groupId || undefined, group: query.subjectId ? { subjectId: query.subjectId } : undefined } }
        : undefined,
  };
  const total = await db.student.count({ where });
  const info = paginate(total, query.page);
  const students = await db.student.findMany({
    where,
    orderBy: { user: { fullName: "asc" } },
    skip: info.skip,
    take: info.take,
    select: {
      id: true,
      user: { select: { fullName: true, login: true, isActive: true } },
      groups: { select: { group: { select: { id: true, name: true } } } },
    },
  });
  const ratings = await getStudentRatings(students.map((s) => s.id), { period: query.period });
  const params = { q: query.q, groupId: query.groupId, subjectId: query.subjectId, status: query.status };

  return (
    <>
      <PageHeader
        title={ru.admin.studentsTitle}
        description={`${ru.common.total}: ${total}`}
        actions={
          <DialogForm trigger={ru.admin.studentNew} title={ru.admin.studentNew} icon={<Plus />} testId="new-student">
            <StudentForm groups={groups} />
          </DialogForm>
        }
      />
      <ListToolbar
        pathname="/admin/students"
        q={query.q}
        filters={[
          { name: "groupId", value: query.groupId, allLabel: ru.common.allGroups, options: groups.map((g) => ({ value: g.id, label: g.name })) },
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
        ]}
      />
      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          {students.length === 0 ? (
            <EmptyState className="my-3" text={query.q || query.groupId || query.subjectId || query.status ? ru.empty.searchNothing : ru.empty.students} />
          ) : (
            <Table data-testid="students-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{ru.common.fullName}</TableHead>
                  <TableHead className="hidden md:table-cell">{ru.common.groups}</TableHead>
                  <TableHead className="hidden sm:table-cell">{ru.common.status}</TableHead>
                  <TableHead className="text-right">{ru.common.rating}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/admin/students/${s.id}`} className="font-bold hover:underline">
                        {s.user.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {s.user.login}
                        <span className="md:hidden">{s.groups.length > 0 && ` · ${s.groups.map((g) => g.group.name).join(", ")}`}</span>
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {s.groups.length === 0 ? ru.common.dash : s.groups.map((g) => g.group.name).join(", ")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <ActiveBadge active={s.user.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RatingBadge value={ratings.get(s.id)?.total ?? null} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination info={info} pathname="/admin/students" params={params} />
        </CardContent>
      </Card>
    </>
  );
}
