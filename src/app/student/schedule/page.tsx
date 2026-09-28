import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { WeekPlanner } from "@/components/common/week-planner";
import { requirePageUser } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { getWeekLessons, resolveWeek } from "@/lib/schedule";
import { studentGroups } from "@/lib/student-data";

export const metadata: Metadata = { title: ru.student.scheduleTitle };

export default async function StudentSchedulePage({ searchParams }: PageProps<"/student/schedule">) {
  const user = await requirePageUser("STUDENT");
  const sp = await searchParams;
  const week = resolveWeek(sp.week);
  const groups = await studentGroups(user.studentId);
  const lessons = await getWeekLessons(groups.map((g) => g.id), week.start);
  return (
    <>
      <PageHeader title={ru.student.scheduleTitle} description={groups.map((g) => g.name).join(", ") || ru.student.noGroups} />
      <WeekPlanner start={week.start} lessons={lessons} pathname="/student/schedule" prev={week.prev} next={week.next} />
    </>
  );
}
