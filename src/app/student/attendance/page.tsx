import type { Metadata } from "next";
import { AttendanceBadge } from "@/components/common/badges";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { AttendanceRing } from "@/components/rating/charts";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageUser } from "@/lib/access";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { attendanceCounts } from "@/lib/trends";
import { studentGroups } from "@/lib/student-data";
import { searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.student.attendanceTitle };


export default async function StudentAttendancePage({ searchParams }: PageProps<"/student/attendance">) {
  const user = await requirePageUser("STUDENT");
  const query = parseListQuery(await searchParams);
  const groups = await studentGroups(user.studentId);
  const subjects = [...new Map(groups.map((g) => [g.subject.id, g.subject])).values()];
  const all = await db.attendance.findMany({
    where: {
      studentId: user.studentId ?? "__none__",
      lesson: { groupId: query.groupId || undefined, group: query.subjectId ? { subjectId: query.subjectId } : undefined },
    },
    orderBy: [{ lesson: { date: "desc" } }, { lesson: { startTime: "desc" } }],
    select: { id: true, status: true, lesson: { select: { date: true, startTime: true, topic: true, group: { select: { name: true } } } } },
  });
  const term = searchTerm(query.q);
  const marks = term ? all.filter((a) => searchTerm(`${a.lesson.topic} ${a.lesson.group.name}`).includes(term)) : all;
  const info = paginate(marks.length, query.page, 15);
  const rows = marks.slice(info.skip, info.skip + info.take);

  return (
    <>
      <PageHeader title={ru.student.attendanceTitle} description={`${ru.common.total}: ${marks.length}`} />
      <ListToolbar
        pathname="/student/attendance"
        q={query.q}
        searchPlaceholder={ru.student.searchGrades}
        filters={[
          { name: "groupId", value: query.groupId, allLabel: ru.common.allGroups, options: groups.map((g) => ({ value: g.id, label: g.name })) },
          { name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
        ]}
      />
      <Card className="mb-6" data-testid="attendance-summary">
        <CardHeader>
          <CardTitle>{ru.charts.attendanceTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceRing counts={attendanceCounts(marks.map((m) => m.status))} />
        </CardContent>
      </Card>
      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          {rows.length === 0 ? (
            <EmptyState kind={query.q || query.groupId || query.subjectId ? "search" : "calendar"} className="my-3" text={query.q || query.groupId || query.subjectId ? ru.empty.searchNothing : ru.empty.attendance} />
          ) : (
            <Table data-testid="student-attendance">
              <TableHeader>
                <TableRow>
                  <TableHead>{ru.common.date}</TableHead>
                  <TableHead>{ru.common.group}</TableHead>
                  <TableHead className="text-right">{ru.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(a.lesson.date)} <span className="text-xs text-muted-foreground">{a.lesson.startTime}</span>
                    </TableCell>
                    <TableCell label={ru.common.group}>
                      {a.lesson.group.name}
                      {a.lesson.topic && <p className="text-xs text-muted-foreground">{a.lesson.topic}</p>}
                    </TableCell>
                    <TableCell label={ru.common.status} className="text-right">
                      <AttendanceBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination info={info} pathname="/student/attendance" params={{ q: query.q, groupId: query.groupId, subjectId: query.subjectId }} />
        </CardContent>
      </Card>
    </>
  );
}
