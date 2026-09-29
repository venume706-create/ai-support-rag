import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { DeleteGroupButton, DeleteSlotButton, RemoveMemberButton } from "@/components/admin/buttons";
import { DialogForm } from "@/components/admin/dialog-form";
import { GroupForm } from "@/components/admin/group-form";
import { MembershipForm } from "@/components/admin/membership-form";
import { SlotForm } from "@/components/admin/slot-form";
import { RatingBadge } from "@/components/common/badges";
import { ListToolbar } from "@/components/common/list-toolbar";
import { Pagination } from "@/components/common/pagination";
import { PageHeader } from "@/components/common/page-header";
import { PersonName } from "@/components/common/person-name";
import { PeriodSwitch } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { pageParam, searchAndPage } from "@/lib/pagination";
import { PERSON_SELECT, nickOf } from "@/lib/person";
import { getStudentRatings } from "@/lib/rating-data";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.common.group };

export default async function GroupPage({ params, searchParams }: PageProps<"/admin/groups/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { period, q } = parseListQuery(sp);
  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      level: true,
      subjectId: true,
      teacherId: true,
      subject: { select: { name: true } },
      teacher: { select: { id: true, user: { select: PERSON_SELECT } } },
      slots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      students: {
        orderBy: [{ student: { user: { nicknameKey: "asc" } } }, { student: { user: { fullName: "asc" } } }],
        select: { student: { select: { id: true, user: { select: PERSON_SELECT } } } },
      },
      _count: { select: { lessons: { where: { date: { lt: today() } } }, homework: true } },
    },
  });
  if (!group) notFound();
  const [subjects, teachers, freeStudents] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.teacher.findMany({ orderBy: [{ user: { nicknameKey: "asc" } }, { user: { fullName: "asc" } }], select: { id: true, user: { select: { nickname: true, login: true } }, subjects: { select: { id: true } } } }),
    db.student.findMany({
      where: { groups: { none: { groupId: id } } },
      orderBy: [{ user: { nicknameKey: "asc" } }, { user: { fullName: "asc" } }],
      select: { id: true, user: { select: { nickname: true, login: true, firstName: true, lastName: true } } },
    }),
  ]);
  const members = searchAndPage(group.students, q, pageParam(sp.sp), (s) => `${s.student.user.nickname ?? ""} ${s.student.user.firstName} ${s.student.user.lastName} ${s.student.user.login}`);
  const ratings = await getStudentRatings(members.rows.map((s) => s.student.id), { period, groupIds: [id] });
  const hrefFor = (p: string) => (p === "all" ? `/admin/groups/${id}` : `/admin/groups/${id}?period=${p}`);

  return (
    <>
      <PageHeader
        title={group.name}
        description={`${group.subject.name}${group.level ? ` · ${group.level}` : ""} · ${group.teacher ? nickOf(group.teacher.user) : ru.common.notAssigned}`}
        backHref="/admin/groups"
        backLabel={ru.admin.groupsTitle}
        actions={
          <>
            <DialogForm trigger={ru.common.edit} title={ru.admin.groupEdit} icon={<Pencil />} variant="outline" testId="edit-group">
              <GroupForm
                  subjects={subjects}
                  teachers={teachers.map((t) => ({ id: t.id, name: nickOf(t.user), subjectIds: t.subjects.map((s) => s.id) }))}
                                    initial={{ id: group.id, name: group.name, subjectId: group.subjectId, teacherId: group.teacherId ?? "", level: group.level }}
                />
            </DialogForm>
            <DeleteGroupButton id={group.id} name={group.name} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {ru.common.students} ({group.students.length})
            </CardTitle>
            <PeriodSwitch period={period} hrefFor={hrefFor} />
          </CardHeader>
          <CardContent className="grid gap-4">
            {group.students.length > 0 && (
              <ListToolbar pathname={`/admin/groups/${id}`} q={q} hidden={period === "month" ? { period } : {}} />
            )}
            {members.rows.length === 0 ? (
              <EmptyState text={q ? ru.empty.searchNothing : ru.empty.groupStudents} />
            ) : (
              <Table data-testid="group-students">
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.student}</TableHead>
                    <TableHead className="text-right">{ru.common.rating}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.rows.map(({ student }) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Link href={`/admin/students/${student.id}`} className="hover:underline">
                          <PersonName user={student.user} avatar="sm" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <RatingBadge value={ratings.get(student.id)?.total ?? null} />
                      </TableCell>
                      <TableCell>
                        <RemoveMemberButton groupId={group.id} studentId={student.id} label={nickOf(student.user)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pagination info={members.info} pathname={`/admin/groups/${id}`} params={{ q, period: period === "month" ? period : undefined }} pageKey="sp" />
            <div>
              <p className="mb-2 text-sm font-bold">{ru.admin.addStudent}</p>
              <MembershipForm fixed={{ groupId: group.id }} options={freeStudents.map((s) => ({ id: s.id, name: `${nickOf(s.user)} · ${s.user.firstName} ${s.user.lastName}` }))} />
            </div>
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{ru.admin.slotsOfGroup}</CardTitle>
              <DialogForm trigger={ru.common.add} title={ru.admin.slotNew} icon={<Plus />} variant="outline" testId="new-slot">
                <SlotForm groupId={group.id} />
              </DialogForm>
            </CardHeader>
            <CardContent>
              {group.slots.length === 0 ? (
                <EmptyState text={ru.empty.schedule} />
              ) : (
                <ul className="grid gap-2" data-testid="group-slots">
                  {group.slots.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 border-b border-dotted border-border pb-2 last:border-0">
                      <div>
                        <p className="font-bold">{ru.common.weekdays[s.dayOfWeek - 1]}</p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {s.startTime}–{s.endTime}
                          {s.room && ` · ${ru.common.room} ${s.room}`}
                        </p>
                      </div>
                      <DeleteSlotButton id={s.id} label={`${ru.common.weekdays[s.dayOfWeek - 1]} ${s.startTime}`} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
                <dt className="text-muted-foreground">{ru.admin.lessonsCount}</dt>
                <dd className="font-bold tabular-nums">{group._count.lessons}</dd>
                <dt className="text-muted-foreground">{ru.teacher.homeworkTitle}</dt>
                <dd className="font-bold tabular-nums">{group._count.homework}</dd>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
