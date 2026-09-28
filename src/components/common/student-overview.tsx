import { AttendanceBadge, GradeBadge, HomeworkBadge } from "@/components/common/badges";
import { RatingCard } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { getStudentRating, type RatingPeriod } from "@/lib/rating-data";

const HISTORY_LIMIT = 15;

/**
 * Рейтинг и история ученика. groupIds ограничивает данные группами
 * (учитель видит только свои группы), без него — все группы ученика.
 */
export async function StudentOverview({
  studentId,
  groupIds,
  period,
  hrefFor,
}: {
  studentId: string;
  groupIds?: string[];
  period: RatingPeriod;
  hrefFor: (p: RatingPeriod) => string;
}) {
  const groupFilter = groupIds ? { in: groupIds } : undefined;
  const [rating, grades, attendance, memberships] = await Promise.all([
    getStudentRating(studentId, { period, groupIds }),
    db.grade.findMany({
      where: { studentId, groupId: groupFilter },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: HISTORY_LIMIT,
      select: { id: true, date: true, value: true, comment: true, group: { select: { name: true } }, lesson: { select: { topic: true } } },
    }),
    db.attendance.findMany({
      where: { studentId, lesson: { groupId: groupFilter } },
      orderBy: { lesson: { date: "desc" } },
      take: HISTORY_LIMIT,
      select: { id: true, status: true, lesson: { select: { date: true, startTime: true, group: { select: { name: true } } } } },
    }),
    db.groupStudent.findMany({ where: { studentId, groupId: groupFilter }, select: { groupId: true } }),
  ]);
  const homework = await db.homework.findMany({
    where: { groupId: { in: memberships.map((m) => m.groupId) } },
    orderBy: { dueDate: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      title: true,
      dueDate: true,
      group: { select: { name: true } },
      submissions: { where: { studentId }, select: { status: true } },
    },
  });
  const now = today();

  return (
    <div className="grid gap-6">
      <RatingCard rating={rating} period={period} hrefFor={hrefFor} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{ru.teacher.gradeHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <EmptyState text={ru.empty.grades} />
            ) : (
              <Table data-testid="grade-history">
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.date}</TableHead>
                    <TableHead>{ru.common.group}</TableHead>
                    <TableHead className="text-right">{ru.teacher.gradeValue}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(g.date)}</TableCell>
                      <TableCell>
                        {g.group.name}
                        {(g.lesson?.topic || g.comment) && (
                          <p className="text-xs text-muted-foreground">{[g.lesson?.topic, g.comment].filter(Boolean).join(" · ")}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <GradeBadge value={g.value} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.teacher.attendanceHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <EmptyState text={ru.empty.attendance} />
            ) : (
              <Table data-testid="attendance-history">
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.date}</TableHead>
                    <TableHead>{ru.common.group}</TableHead>
                    <TableHead className="text-right">{ru.common.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDate(a.lesson.date)} <span className="text-xs text-muted-foreground">{a.lesson.startTime}</span>
                      </TableCell>
                      <TableCell>{a.lesson.group.name}</TableCell>
                      <TableCell className="text-right">
                        <AttendanceBadge status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{ru.teacher.homeworkHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {homework.length === 0 ? (
            <EmptyState text={ru.empty.homework} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ru.teacher.homeworkTitleField}</TableHead>
                  <TableHead>{ru.teacher.dueDate}</TableHead>
                  <TableHead className="text-right">{ru.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homework.map((h) => {
                  const status = h.submissions[0]?.status ?? (h.dueDate < now ? "NOT_DONE" : "PENDING");
                  return (
                    <TableRow key={h.id}>
                      <TableCell>
                        {h.title}
                        <p className="text-xs text-muted-foreground">{h.group.name}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(h.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        <HomeworkBadge status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
