import type { Metadata } from "next";
import { HomeworkBadge } from "@/components/common/badges";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { requirePageUser } from "@/lib/access";
import { formatDate, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { paginate } from "@/lib/pagination";
import { studentGroups } from "@/lib/student-data";
import { cn, searchTerm } from "@/lib/utils";
import { parseListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: ru.student.homeworkTitle };

export default async function StudentHomeworkPage({ searchParams }: PageProps<"/student/homework">) {
  const user = await requirePageUser("STUDENT");
  const studentId = user.studentId ?? "__none__";
  const query = parseListQuery(await searchParams);
  const groups = await studentGroups(user.studentId);
  const subjects = [...new Map(groups.map((g) => [g.subject.id, g.subject])).values()];
  const groupIds = groups.map((g) => g.id).filter((id) => !query.groupId || id === query.groupId);
  const all = await db.homework.findMany({
    where: { groupId: { in: groupIds }, group: query.subjectId ? { subjectId: query.subjectId } : undefined },
    orderBy: { dueDate: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      group: { select: { name: true } },
      submissions: { where: { studentId }, select: { status: true } },
    },
  });
  const term = searchTerm(query.q);
  const homework = term ? all.filter((h) => searchTerm(`${h.title} ${h.description}`).includes(term)) : all;
  const info = paginate(homework.length, query.page, 9);
  const rows = homework.slice(info.skip, info.skip + info.take);
  const now = today();

  return (
    <>
      <PageHeader title={ru.student.homeworkTitle} description={`${ru.common.total}: ${homework.length}`} />
      <ListToolbar
        pathname="/student/homework"
        q={query.q}
        searchPlaceholder={ru.student.searchHomework}
        filters={[
          { name: "groupId", value: query.groupId, allLabel: ru.common.allGroups, options: groups.map((g) => ({ value: g.id, label: g.name })) },
          { name: "subjectId", value: query.subjectId, allLabel: ru.common.allSubjects, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
        ]}
      />
      <div className="cork rounded-lg p-5 sm:p-7" data-testid="homework-board">
        {rows.length === 0 ? (
          <div className="paper mx-auto max-w-sm rounded-sm p-6 text-center">
            <p className="handwritten text-2xl text-muted-foreground">
              {query.q || query.groupId || query.subjectId ? ru.empty.searchNothing : ru.empty.homework}
            </p>
          </div>
        ) : (
          <ul className="grid gap-8 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((h, i) => {
              const overdue = h.dueDate < now;
              const status = h.submissions[0]?.status ?? (overdue ? "NOT_DONE" : "PENDING");
              return (
                <li
                  key={h.id}
                  className="note paper relative rounded-sm p-4 pt-5"
                  style={{ "--tilt": `${[-1.5, 1, -0.5, 1.5, -1][i % 5]}deg` } as React.CSSProperties}
                  data-testid="homework-note"
                >
                  <span className="pin" aria-hidden />
                  <p className="text-xs font-bold text-muted-foreground uppercase">{h.group.name}</p>
                  <h3 className="mt-1 font-serif text-lg leading-tight font-bold">{h.title}</h3>
                  {h.description && <p className="mt-2 text-sm whitespace-pre-line">{h.description}</p>}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className={cn("handwritten text-xl", overdue ? "text-ink-red" : "text-ink-blue")}>
                      {ru.student.dueUntil(formatDate(h.dueDate))}
                    </span>
                    <HomeworkBadge status={status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="paper mt-4 rounded-md px-4 pb-3">
        <Pagination info={info} pathname="/student/homework" params={{ q: query.q, groupId: query.groupId, subjectId: query.subjectId }} />
      </div>
    </>
  );
}
