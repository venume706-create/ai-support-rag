import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { WeekPlanner } from "@/components/common/week-planner";
import { requirePageUser } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { getWeekLessons, resolveWeek } from "@/lib/schedule";
import { teacherGroupIds } from "@/lib/teacher-data";

export const metadata: Metadata = { title: ru.nav.schedule };

export default async function TeacherSchedulePage({ searchParams }: PageProps<"/teacher/schedule">) {
  const user = await requirePageUser("TEACHER");
  const sp = await searchParams;
  const week = resolveWeek(sp.week);
  const lessons = await getWeekLessons(await teacherGroupIds(user.teacherId), week.start);
  return (
    <>
      <PageHeader title={ru.teacher.weekSchedule} description={user.nick} />
      <WeekPlanner
        start={week.start}
        lessons={lessons}
        pathname="/teacher/schedule"
        prev={week.prev}
        next={week.next}
        showTeacher={false}
        lessonHref={(l) => `/teacher/groups/${l.groupId}?lesson=${l.id}`}
      />
    </>
  );
}
