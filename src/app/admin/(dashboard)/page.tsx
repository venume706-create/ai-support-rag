import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, GraduationCap, UserRound, UsersRound } from "lucide-react";
import { RatingBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { PersonName } from "@/components/common/person-name";
import { PeriodSwitch } from "@/components/common/rating-card";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { PERSON_SELECT } from "@/lib/person";
import { getStudentRatings, getTeacherRatings, monthAttendancePercent } from "@/lib/rating-data";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.dashboardTitle };

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const { period } = parseListQuery(await searchParams);
  const [students, teachers, groups, attendance, teacherRatings] = await Promise.all([
    db.student.findMany({ select: { id: true, user: { select: PERSON_SELECT }, groups: { select: { group: { select: { name: true } } } } } }),
    db.teacher.count(),
    db.group.count(),
    monthAttendancePercent(),
    getTeacherRatings(period),
  ]);
  const ratings = await getStudentRatings(students.map((s) => s.id), { period });
  const top = students
    .map((s) => ({ ...s, rating: ratings.get(s.id)!.total }))
    .filter((s) => s.rating !== null)
    .sort((a, b) => b.rating! - a.rating!)
    .slice(0, 10);
  const hrefFor = (p: string) => (p === "all" ? "/admin" : `/admin?period=${p}`);

  return (
    <>
      <PageHeader title={ru.admin.dashboardTitle} description={ru.app.tagline} actions={<PeriodSwitch period={period} hrefFor={hrefFor} />} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label={ru.admin.statsStudents} value={students.length} icon={<UserRound className="size-5" />} />
        <StatCard label={ru.admin.statsTeachers} value={teachers} icon={<GraduationCap className="size-5" />} />
        <StatCard label={ru.admin.statsGroups} value={groups} icon={<UsersRound className="size-5" />} />
        <StatCard
          label={ru.admin.statsAttendance}
          value={attendance === null ? ru.common.dash : Math.round(attendance)}
          suffix={attendance === null ? undefined : "%"}
          icon={<CalendarCheck className="size-5" />}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.topStudents}</CardTitle>
            <CardDescription>{period === "month" ? ru.rating.periodMonth : ru.rating.periodAll}</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <EmptyState text={ru.empty.ratings} />
            ) : (
              <Table data-testid="top-students">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">{ru.common.number}</TableHead>
                    <TableHead>{ru.common.student}</TableHead>
                    <TableHead className="text-right">{ru.common.rating}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="handwritten text-xl text-ink-blue">{i + 1}</TableCell>
                      <TableCell label={ru.common.student}>
                        <Link href={`/admin/students/${s.id}`} className="hover:underline">
                          <PersonName user={s.user} avatar="sm" />
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.groups.map((g) => g.group.name).join(", ")}</p>
                      </TableCell>
                      <TableCell label={ru.common.rating} className="text-right">
                        <RatingBadge value={s.rating} />
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
            <CardTitle>{ru.admin.teacherRatings}</CardTitle>
            <CardDescription>{ru.rating.teacherRatingHint}</CardDescription>
          </CardHeader>
          <CardContent>
            {teacherRatings.length === 0 ? (
              <EmptyState text={ru.empty.teachers} />
            ) : (
              <Table data-testid="teacher-ratings">
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.teacher}</TableHead>
                    <TableHead className="text-center">{ru.admin.groupsCount}</TableHead>
                    <TableHead className="text-right">{ru.common.rating}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherRatings.map((t) => (
                    <TableRow key={t.teacherId}>
                      <TableCell>
                        <Link href={`/admin/teachers/${t.teacherId}`} className="hover:underline">
                          <PersonName user={t.person} avatar="sm" />
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {ru.rating.teacherAttendanceShort}: {t.attendancePercent === null ? ru.common.dash : ru.rating.percent(t.attendancePercent)} · {ru.rating.teacherHomeworkShort}:{" "}
                          {t.homeworkPercent === null ? ru.common.dash : ru.rating.percent(t.homeworkPercent)}
                        </p>
                      </TableCell>
                      <TableCell label={ru.admin.groupsCount} className="text-center tabular-nums">{t.groups}</TableCell>
                      <TableCell label={ru.common.rating} className="text-right">
                        <RatingBadge value={t.rating} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
