import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { RemoveMemberButton } from "@/components/admin/buttons";
import { DialogForm } from "@/components/admin/dialog-form";
import { MembershipForm } from "@/components/admin/membership-form";
import { StudentForm } from "@/components/admin/student-form";
import { UserActions } from "@/components/admin/user-actions";
import { ActiveBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { StudentOverview } from "@/components/common/student-overview";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, toDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.profile };

export default async function StudentProfile({ params, searchParams }: PageProps<"/admin/students/[id]">) {
  const { id } = await params;
  const { period } = parseListQuery(await searchParams);
  const student = await db.student.findUnique({
    where: { id },
    select: {
      id: true,
      parentPhone: true,
      birthDate: true,
      user: { select: { id: true, login: true, fullName: true, phone: true, isActive: true, createdAt: true } },
      groups: {
        orderBy: { group: { name: "asc" } },
        select: {
          group: {
            select: { id: true, name: true, subject: { select: { name: true } }, teacher: { select: { user: { select: { fullName: true } } } } },
          },
        },
      },
    },
  });
  if (!student) notFound();
  const memberIds = student.groups.map((g) => g.group.id);
  const freeGroups = await db.group.findMany({ where: { id: { notIn: memberIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const hrefFor = (p: string) => (p === "all" ? `/admin/students/${id}` : `/admin/students/${id}?period=${p}`);

  return (
    <>
      <PageHeader
        title={student.user.fullName}
        description={ru.roles.STUDENT}
        backHref="/admin/students"
        backLabel={ru.admin.studentsTitle}
        actions={
          <>
            <DialogForm trigger={ru.common.edit} title={ru.admin.studentEdit} icon={<Pencil />} variant="outline" testId="edit-student">
              <StudentForm
                                    initial={{
                    id: student.id,
                    login: student.user.login,
                    fullName: student.user.fullName,
                    phone: student.user.phone,
                    parentPhone: student.parentPhone,
                    birthDate: student.birthDate ? toDateOnly(student.birthDate) : "",
                  }}
                />
            </DialogForm>
            <UserActions userId={student.user.id} isActive={student.user.isActive} name={student.user.fullName} kind="student" entityId={student.id} />
          </>
        }
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.profile}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{ru.common.login}</dt>
              <dd className="font-bold">{student.user.login}</dd>
              <dt className="text-muted-foreground">{ru.common.phone}</dt>
              <dd>{student.user.phone || ru.common.dash}</dd>
              <dt className="text-muted-foreground">{ru.common.parentPhone}</dt>
              <dd>{student.parentPhone || ru.common.dash}</dd>
              <dt className="text-muted-foreground">{ru.common.birthDate}</dt>
              <dd>{student.birthDate ? formatDate(student.birthDate) : ru.common.dash}</dd>
              <dt className="text-muted-foreground">{ru.common.status}</dt>
              <dd>
                <ActiveBadge active={student.user.isActive} />
              </dd>
              <dt className="text-muted-foreground">{ru.common.createdAt}</dt>
              <dd>{formatDate(student.user.createdAt)}</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.studentGroups}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {student.groups.length === 0 ? (
              <EmptyState text={ru.empty.groups} />
            ) : (
              <ul className="grid gap-2">
                {student.groups.map(({ group }) => (
                  <li key={group.id} className="flex items-center justify-between gap-2 border-b border-dotted border-border pb-2 last:border-0">
                    <div>
                      <Link href={`/admin/groups/${group.id}`} className="font-bold hover:underline">
                        {group.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {group.subject.name} · {group.teacher?.user.fullName ?? ru.common.notAssigned}
                      </p>
                    </div>
                    <RemoveMemberButton groupId={group.id} studentId={student.id} label={group.name} />
                  </li>
                ))}
              </ul>
            )}
            <MembershipForm fixed={{ studentId: student.id }} options={freeGroups} emptyText={ru.admin.noFreeGroups} />
          </CardContent>
        </Card>
      </div>
      <StudentOverview studentId={student.id} period={period} hrefFor={hrefFor} />
    </>
  );
}
