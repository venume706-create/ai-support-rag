import { AttendanceBadge, GradeBadge, HomeworkBadge } from "@/components/common/badges";
import { RatingCard } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/common/pagination";
import { formatDate, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate, pageParam } from "@/lib/pagination";
import { getStudentRating, type RatingPeriod } from "@/lib/rating-data";

const HISTORY_PAGE = 10;

/**
 * Рейтинг и история ученика. groupIds ограничивает данные группами
 * (учитель видит только свои группы), без него — все группы ученика.
 */
export async function StudentOverview({
  studentId,
  groupIds,
  period,
  hrefFor,
  pathname,
  searchParams,
}: {
  studentId: string;
  groupIds?: string[];
  period: RatingPeriod;
  hrefFor: (p: RatingPeriod) => string;
  /** Адрес страницы и её параметры — для листания истории */
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const groupFilter = groupIds ? { in: groupIds } : undefined;
  const gradeWhere = { studentId, groupId: groupFilter };
  const attendanceWhere = { studentId, lesson: { groupId: groupFilter } };
  const [rating, gradeTotal, attendanceTotal, memberships] = await Promise.all([
    getStudentRating(studentId, { period, groupIds }),
    db.grade.count({ where: gradeWhere }),
    db.attendance.count({ where: attendanceWhere }),
    db.groupStudent.findMany({ where: { studentId, groupId: groupFilter }, select: { groupId: true } }),
  ]);
  const homeworkWhere = { groupId: { in: memberships.map((m) => m.groupId) } };
  const homeworkTotal = await db.homework.count({ where: homeworkWhere });
  const gp = paginate(gradeTotal, pageParam(searchParams.gp), HISTORY_PAGE);
  const ap = paginate(attendanceTotal, pageParam(searchParams.ap), HISTORY_PAGE);
  const hp = paginate(homeworkTotal, pageParam(searchParams.hp), HISTORY_PAGE);
  const params = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as Record<string, string | undefined>;

  const [grades, attendance] = await Promise.all([
    db.grade.findMany({
      where: gradeWhere,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: gp.skip,
      take: gp.take,
      select: { id: true, date: true, value: true, comment: true, group: { select: { name: true } }, lesson: { select: { topic: true } } },
    }),
    db.attendance.findMany({
      where: attendanceWhere,
      orderBy: [{ lesson: { date: "desc" } }, { lesson: { startTime: "desc" } }],
      skip: ap.skip,
      take: ap.take,
      select: { id: true, status: true, lesson: { select: { date: true, startTime: true, group: { select: { name: true } } } } },
    }),
  ]);
  const homework = await db.homework.findMany({
    where: homeworkWhere,
    orderBy: { dueDate: "desc" },
    skip: hp.skip,
    take: hp.take,
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
        <Card id="grades">
          <CardHeader>
            <CardTitle>{ru.teacher.gradeHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <EmptyState kind="star" text={ru.empty.grades} />
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
                      <TableCell label={ru.common.group}>
                        {g.group.name}
                        {(g.lesson?.topic || g.comment) && (
                          <p className="text-xs text-muted-foreground">{[g.lesson?.topic, g.comment].filter(Boolean).join(" · ")}</p>
                        )}
                      </TableCell>
                      <TableCell label={ru.teacher.gradeValue} className="text-right">
                        <GradeBadge value={g.value} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pagination info={gp} pathname={pathname} params={params} pageKey="gp" hash="grades" />
          </CardContent>
        </Card>
        <Card id="attendance">
          <CardHeader>
            <CardTitle>{ru.teacher.attendanceHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <EmptyState kind="calendar" text={ru.empty.attendance} />
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
                      <TableCell label={ru.common.group}>{a.lesson.group.name}</TableCell>
                      <TableCell label={ru.common.status} className="text-right">
                        <AttendanceBadge status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pagination info={ap} pathname={pathname} params={params} pageKey="ap" hash="attendance" />
          </CardContent>
        </Card>
      </div>
      <Card id="homework">
        <CardHeader>
          <CardTitle>{ru.teacher.homeworkHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {homework.length === 0 ? (
            <EmptyState kind="board" text={ru.empty.homework} />
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
                      <TableCell label={ru.teacher.dueDate} className="whitespace-nowrap tabular-nums">{formatDate(h.dueDate)}</TableCell>
                      <TableCell label={ru.common.status} className="text-right">
                        <HomeworkBadge status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Pagination info={hp} pathname={pathname} params={params} pageKey="hp" hash="homework" />
        </CardContent>
      </Card>
    </div>
  );
}
