import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DialogForm } from "@/components/admin/dialog-form";
import { TeacherForm } from "@/components/admin/teacher-form";
import { UserActions } from "@/components/admin/user-actions";
import { ActiveBadge, RatingBadge } from "@/components/common/badges";
import { Gauge } from "@/components/common/gauge";
import { PageHeader } from "@/components/common/page-header";
import { PeriodSwitch, ratingTextClass } from "@/components/common/rating-card";
import { EmptyState } from "@/components/common/status-views";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { getStudentRatings, getTeacherRatings } from "@/lib/rating-data";
import { cn } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.admin.profile };

export default async function TeacherProfile({ params, searchParams }: PageProps<"/admin/teachers/[id]">) {
  const { id } = await params;
  const { period } = parseListQuery(await searchParams);
  const teacher = await db.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: { id: true, login: true, fullName: true, phone: true, isActive: true, createdAt: true } },
      subjects: { select: { id: true, name: true } },
      groups: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          level: true,
          subject: { select: { name: true } },
          students: { select: { student: { select: { id: true, user: { select: { fullName: true } } } } } },
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
  const hrefFor = (p: string) => (p === "all" ? `/admin/teachers/${id}` : `/admin/teachers/${id}?period=${p}`);

  return (
    <>
      <PageHeader
        title={teacher.user.fullName}
        description={ru.roles.TEACHER}
        backHref="/admin/teachers"
        backLabel={ru.admin.teachersTitle}
        actions={
          <>
            <DialogForm trigger={ru.common.edit} title={ru.admin.teacherEdit} icon={<Pencil />} variant="outline" testId="edit-teacher">
              <TeacherForm
                  subjects={subjects}
                                    initial={{
                    id: teacher.id,
                    login: teacher.user.login,
                    fullName: teacher.user.fullName,
                    phone: teacher.user.phone,
                    subjectIds: teacher.subjects.map((s) => s.id),
                  }}
                />
            </DialogForm>
            <UserActions userId={teacher.user.id} isActive={teacher.user.isActive} name={teacher.user.fullName} kind="teacher" entityId={teacher.id} />
          </>
        }
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{ru.admin.profile}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{ru.common.login}</dt>
              <dd className="font-bold">{teacher.user.login}</dd>
              <dt className="text-muted-foreground">{ru.common.phone}</dt>
              <dd>{teacher.user.phone || ru.common.dash}</dd>
              <dt className="text-muted-foreground">{ru.common.subjects}</dt>
              <dd>{teacher.subjects.map((s) => s.name).join(", ")}</dd>
              <dt className="text-muted-foreground">{ru.common.status}</dt>
              <dd>
                <ActiveBadge active={teacher.user.isActive} />
              </dd>
              <dt className="text-muted-foreground">{ru.common.createdAt}</dt>
              <dd>{formatDate(teacher.user.createdAt)}</dd>
            </dl>
          </CardContent>
        </Card>
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
            <span className="text-sm text-muted-foreground">{ru.rating.studentsCounted(ratingRow?.studentsCounted ?? 0)}</span>
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
              <EmptyState text={ru.empty.groups} />
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
            {students.length === 0 ? (
              <EmptyState text={ru.empty.students} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ru.common.student}</TableHead>
                    <TableHead className="text-right">{ru.common.rating}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students
                    .map((s) => ({ ...s, rating: ratings.get(s.id)?.total ?? null }))
                    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
                    .map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link href={`/admin/students/${s.id}`} className="font-bold hover:underline">
                            {s.user.fullName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <RatingBadge value={s.rating} />
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
