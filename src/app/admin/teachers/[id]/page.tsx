import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProfileCard, AdminUserActions } from "@/components/admin/admin-user-panel";
import { RatingBadge } from "@/components/common/badges";
import { PersonName } from "@/components/common/person-name";
import { TeacherStats } from "@/components/rating/teacher-stats";
import { ListToolbar } from "@/components/common/list-toolbar";
import { Pagination } from "@/components/common/pagination";
import { Gauge } from "@/components/common/gauge";
import { PageHeader } from "@/components/common/page-header";
import { PeriodSwitch, ratingTextClass } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { pageParam, searchAndPage } from "@/lib/pagination";
import { ADMIN_USER_SELECT, PERSON_SELECT, nickOf, realNameOf } from "@/lib/person";
import { getStudentRatings, getTeacherRatings } from "@/lib/rating-data";
import { cn } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.profile };

export default async function TeacherProfile({ params, searchParams }: PageProps<"/admin/teachers/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { period, q } = parseListQuery(sp);
  const teacher = await db.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: ADMIN_USER_SELECT },
      subjects: { select: { id: true, name: true } },
      groups: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          level: true,
          subject: { select: { name: true } },
          students: { select: { student: { select: { id: true, user: { select: PERSON_SELECT } } } } },
        },
      },
    },
  });
  if (!teacher) notFound();
  const subjects = await db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const [ratingRow] = await getTeacherRatings(period, [id]);
  const groupIds = teacher.groups.map((g) => g.id);
  const students = [...new Map(teacher.groups.flatMap((g) => g.students.map((s) => [s.student.id, s.student]))).values()];
  const ratings = await getStudentRatings(students.map((s) => s.id), { period, groupIds });
  const sorted = students
    .map((s) => ({ ...s, rating: ratings.get(s.id)?.total ?? null }))
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  const studentPage = searchAndPage(sorted, q, pageParam(sp.sp), (s) => `${s.user.nickname ?? ""} ${s.user.firstName} ${s.user.lastName}`);
  const hrefFor = (p: string) => (p === "all" ? `/admin/teachers/${id}` : `/admin/teachers/${id}?period=${p}`);

  return (
    <>
      <PageHeader
        title={nickOf(teacher.user)}
        description={`${realNameOf(teacher.user)} · ${ru.roles.TEACHER}`}
        backHref="/admin/teachers"
        backLabel={ru.admin.teachersTitle}
        actions={
          <AdminUserActions
            user={teacher.user}
            role="TEACHER"
            entityId={teacher.id}
            subjects={subjects}
            subjectIds={teacher.subjects.map((s) => s.id)}
          />
        }
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <AdminProfileCard user={teacher.user} role="TEACHER" subjectNames={teacher.subjects.map((x) => x.name)} />
        <Card data-testid="teacher-rating">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{ru.rating.teacherRating}</CardTitle>
              <CardDescription>{ru.rating.teacherRatingHint}</CardDescription>
            </div>
            <PeriodSwitch period={period} hrefFor={hrefFor} />
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Gauge value={ratingRow?.rating ?? null} label={ru.rating.teacherRating} />
            <span className={cn("-mt-1 font-serif text-4xl font-bold tabular-nums", ratingTextClass(ratingRow?.rating ?? null))}>
              {ratingRow?.rating == null ? ru.common.noData : ratingRow.rating.toFixed(1)}
            </span>
            <span className="mb-4 text-sm text-muted-foreground">{ru.rating.studentsCounted(ratingRow?.studentsCounted ?? 0)}</span>
            <TeacherStats attendancePercent={ratingRow?.attendancePercent ?? null} homeworkPercent={ratingRow?.homeworkPercent ?? null} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.teacherGroups}</CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.groups.length === 0 ? (
              <EmptyState kind="people" text={ru.empty.groups} />
            ) : (
              <ul className="grid gap-2">
                {teacher.groups.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 border-b border-dotted border-border pb-2 last:border-0">
                    <div>
                      <Link href={`/admin/groups/${g.id}`} className="font-bold hover:underline">
                        {g.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {g.subject.name}
                        {g.level && ` · ${g.level}`}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {ru.admin.studentsCount}: {g.students.length}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.common.students}</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length > 0 && (
              <ListToolbar pathname={`/admin/teachers/${id}`} q={q} hidden={period === "month" ? { period } : {}} />
            )}
            {studentPage.rows.length === 0 ? (
              <EmptyState kind={q ? "search" : "people"} text={q ? ru.empty.searchNothing : ru.empty.students} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.student}</TableHead>
                    <TableHead className="text-right">{ru.common.rating}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentPage.rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link href={`/admin/students/${s.id}`} className="hover:underline">
                            <PersonName user={s.user} avatar="sm" />
                          </Link>
                        </TableCell>
                        <TableCell label={ru.common.rating} className="text-right">
                          <RatingBadge value={s.rating} />
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pagination info={studentPage.info} pathname={`/admin/teachers/${id}`} params={{ q, period: period === "month" ? period : undefined }} pageKey="sp" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
