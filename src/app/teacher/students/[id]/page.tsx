import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/common/avatar";
import { PageHeader } from "@/components/common/page-header";
import { StudentOverview } from "@/components/common/student-overview";
import { Card, CardContent } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { tintClass } from "@/lib/appearance";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { PERSON_SELECT, nickOf, realNameOf } from "@/lib/person";
import { teacherGroupIds } from "@/lib/teacher-data";
import { cn } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.profile };

export default async function TeacherStudentPage({ params, searchParams }: PageProps<"/teacher/students/[id]">) {
  const user = await requirePageUser("TEACHER");
  const { id } = await params;
  const sp = await searchParams;
  const { period } = parseListQuery(sp);
  const myGroups = await teacherGroupIds(user.teacherId);
  // Контакты (телефоны, почта, дата рождения) учителю не показываются — только администратору и самому ученику
  const student = await db.student.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: { ...PERSON_SELECT, bio: true } },
      groups: { where: { groupId: { in: myGroups } }, select: { group: { select: { id: true, name: true } } } },
    },
  });
  if (!student) notFound();
  const hrefFor = (p: string) => (p === "all" ? `/teacher/students/${id}` : `/teacher/students/${id}?period=${p}`);
  const firstGroup = student.groups[0]?.group;

  return (
    <>
      <PageHeader
        title={nickOf(student.user)}
        description={`${realNameOf(student.user)} · ${student.groups.map((g) => g.group.name).join(", ")}`}
        backHref={firstGroup ? `/teacher/groups/${firstGroup.id}?tab=students` : "/teacher"}
        backLabel={firstGroup?.name ?? ru.nav.dashboard}
      />
      <Card className={cn("mb-6", tintClass(student.user.cardColor))} data-testid="student-card">
        <CardContent className="flex items-center gap-4">
          <Avatar user={student.user} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-serif text-2xl font-bold">{nickOf(student.user)}</p>
            <p className="truncate text-sm text-muted-foreground">{realNameOf(student.user)}</p>
            {student.user.bio && <p className="mt-2 text-sm whitespace-pre-line">{student.user.bio}</p>}
          </div>
        </CardContent>
      </Card>
      <StudentOverview studentId={student.id} groupIds={myGroups} period={period} hrefFor={hrefFor} pathname={`/teacher/students/${id}`} searchParams={sp} />
    </>
  );
}
