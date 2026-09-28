import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { StudentOverview } from "@/components/common/student-overview";
import { Card, CardContent } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { teacherGroupIds } from "@/lib/teacher-data";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.profile };

export default async function TeacherStudentPage({ params, searchParams }: PageProps<"/teacher/students/[id]">) {
  const user = await requirePageUser("TEACHER");
  const { id } = await params;
  const { period } = parseListQuery(await searchParams);
  const myGroups = await teacherGroupIds(user.teacherId);
  const student = await db.student.findUnique({
    where: { id },
    select: {
      id: true,
      parentPhone: true,
      user: { select: { fullName: true, phone: true } },
      groups: { where: { groupId: { in: myGroups } }, select: { group: { select: { id: true, name: true } } } },
    },
  });
  if (!student) notFound();
  const hrefFor = (p: string) => (p === "all" ? `/teacher/students/${id}` : `/teacher/students/${id}?period=${p}`);
  const firstGroup = student.groups[0]?.group;

  return (
    <>
      <PageHeader
        title={student.user.fullName}
        description={student.groups.map((g) => g.group.name).join(", ")}
        backHref={firstGroup ? `/teacher/groups/${firstGroup.id}?tab=students` : "/teacher"}
        backLabel={firstGroup?.name ?? ru.nav.dashboard}
      />
      <Card className="mb-6">
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{ru.common.phone}</dt>
            <dd>{student.user.phone || ru.common.dash}</dd>
            <dt className="text-muted-foreground">{ru.common.parentPhone}</dt>
            <dd>{student.parentPhone || ru.common.dash}</dd>
          </dl>
        </CardContent>
      </Card>
      <StudentOverview studentId={student.id} groupIds={myGroups} period={period} hrefFor={hrefFor} />
    </>
  );
}
