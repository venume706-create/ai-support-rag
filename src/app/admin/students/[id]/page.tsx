import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RemoveMemberButton } from "@/components/admin/buttons";
import { AdminProfileCard, AdminUserActions } from "@/components/admin/admin-user-panel";
import { MembershipForm } from "@/components/admin/membership-form";
import { PageHeader } from "@/components/common/page-header";
import { StudentNotes } from "@/components/teacher/student-notes";
import { StudentRatingSections } from "@/components/rating/student-sections";
import { StudentOverview } from "@/components/common/student-overview";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { ADMIN_USER_SELECT, PERSON_SELECT, nickOf, realNameOf } from "@/lib/person";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.profile };

export default async function StudentProfile({ params, searchParams }: PageProps<"/admin/students/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { period } = parseListQuery(sp);
  const student = await db.student.findUnique({
    where: { id },
    select: {
      id: true,
      parentPhone: true,
      showInLeaderboard: true,
      user: { select: ADMIN_USER_SELECT },
      groups: {
        orderBy: { group: { name: "asc" } },
        select: {
          group: {
            select: { id: true, name: true, subject: { select: { name: true } }, teacher: { select: { user: { select: PERSON_SELECT } } } },
          },
        },
      },
    },
  });
  if (!student) notFound();
  const memberIds = student.groups.map((g) => g.group.id);
  const freeGroups = await db.group.findMany({ where: { id: { notIn: memberIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const notes = await db.teacherNote.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, text: true, createdAt: true, teacher: { select: { user: { select: PERSON_SELECT } } } },
  });
  const hrefFor = (p: string) => (p === "all" ? `/admin/students/${id}` : `/admin/students/${id}?period=${p}`);

  return (
    <>
      <PageHeader
        title={nickOf(student.user)}
        description={`${realNameOf(student.user)} · ${ru.roles.STUDENT}`}
        backHref="/admin/students"
        backLabel={ru.admin.studentsTitle}
        actions={
          <AdminUserActions user={student.user} role="STUDENT" entityId={student.id} parentPhone={student.parentPhone} showInLeaderboard={student.showInLeaderboard} />
        }
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <AdminProfileCard user={student.user} role="STUDENT" parentPhone={student.parentPhone} />
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.studentGroups}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {student.groups.length === 0 ? (
              <EmptyState kind="people" text={ru.empty.groups} />
            ) : (
              <ul className="grid gap-2">
                {student.groups.map(({ group }) => (
                  <li key={group.id} className="flex items-center justify-between gap-2 border-b border-dotted border-border pb-2 last:border-0">
                    <div>
                      <Link href={`/admin/groups/${group.id}`} className="font-bold hover:underline">
                        {group.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {group.subject.name} · {group.teacher ? nickOf(group.teacher.user) : ru.common.notAssigned}
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
      <div className="mb-6">
        <StudentRatingSections studentId={student.id} view="staff" pathname={`/admin/students/${id}`} searchParams={sp} />
      </div>
      <div className="mb-6">
        <StudentNotes
          studentId={student.id}
          readOnly
          notes={notes.map((n) => ({ id: n.id, text: n.text, date: formatDate(n.createdAt), author: nickOf(n.teacher.user) }))}
        />
      </div>
      <StudentOverview studentId={student.id} period={period} hrefFor={hrefFor} pathname={`/admin/students/${id}`} searchParams={sp} />
    </>
  );
}
