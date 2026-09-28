import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { GenerateLessonsButton } from "@/components/admin/buttons";
import { DialogForm } from "@/components/admin/dialog-form";
import { SlotForm } from "@/components/admin/slot-form";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { WeekPlanner } from "@/components/common/week-planner";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { getWeekLessons, resolveWeek } from "@/lib/schedule";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.scheduleTitle };

export default async function AdminSchedulePage({ searchParams }: PageProps<"/admin/schedule">) {
  const sp = await searchParams;
  const query = parseListQuery(sp);
  const week = resolveWeek(sp.week);
  const [groups, subjects, teachers] = await Promise.all([
    db.group.findMany({
      where: { subjectId: query.subjectId || undefined, teacherId: query.teacherId || undefined, id: query.groupId || undefined },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.teacher.findMany({ orderBy: { user: { fullName: "asc" } }, select: { id: true, user: { select: { fullName: true } } } }),
  ]);
  const allGroups = await db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const lessons = await getWeekLessons(groups.map((g) => g.id), week.start);
  const filterParams = Object.fromEntries(
    Object.entries({ groupId: query.groupId, subjectId: query.subjectId, teacherId: query.teacherId }).filter(([, v]) => v),
  );

  return (
    <>
      <PageHeader
        title={ru.admin.scheduleTitle}
        description={ru.admin.weekView}
        actions={
          <>
            <GenerateLessonsButton />
            <DialogForm trigger={ru.admin.slotNew} title={ru.admin.slotNew} icon={<Plus />} testId="new-slot">
              <SlotForm groups={allGroups} />
            </DialogForm>
          </>
        }
      />
      <ListToolbar
        pathname="/admin/schedule"
        showSearch={false}
        hidden={typeof sp.week === "string" ? { week: sp.week } : {}}
        filters={[
          { name: "groupId", value: query.groupId, allLabel: ru.common.allGroups, options: allGroups.map((g) => ({ value: g.id, label: g.name })) },
          { name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
          { name: "teacherId", value: query.teacherId, allLabel: ru.admin.filterTeacher, options: teachers.map((t) => ({ value: t.id, label: t.user.fullName })) },
        ]}
      />
      <WeekPlanner
        start={week.start}
        lessons={lessons}
        pathname="/admin/schedule"
        params={filterParams}
        prev={week.prev}
        next={week.next}
        lessonHref={(l) => `/admin/groups/${l.groupId}`}
      />
    </>
  );
}
