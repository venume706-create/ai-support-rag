import Link from "next/link";
import type { AttendanceStatus } from "@prisma/client";
import { PersonName } from "@/components/common/person-name";
import { formatDate } from "@/lib/dates";
import type { PersonLike } from "@/lib/person";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

interface GridLesson {
  id: string;
  date: Date;
  startTime: string;
}

/** Страница школьного журнала: ученики × уроки, отметки и оценки «от руки». */
export function JournalGrid({
  lessons,
  students,
  attendance,
  grades,
  hrefFor,
  selectedId,
}: {
  lessons: GridLesson[];
  students: { id: string; name: string; person: PersonLike }[];
  attendance: Map<string, AttendanceStatus>;
  grades: Map<string, number[]>;
  hrefFor: (lessonId: string) => string;
  selectedId?: string;
}) {
  const key = (lessonId: string, studentId: string) => `${lessonId}|${studentId}`;
  return (
    <div className="ruled overflow-x-auto rounded-md" data-testid="journal-grid">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="h-11">
            <th className="sticky left-0 z-10 w-10 pl-2 text-left font-serif text-xs text-muted-foreground">{ru.common.number}</th>
            <th className="min-w-40 pl-3 text-left font-serif text-xs font-bold text-muted-foreground uppercase">{ru.common.student}</th>
            {lessons.map((l) => (
              <th key={l.id} className={cn("w-12 border-l border-paper-line px-1 text-center", selectedId === l.id && "bg-brass/20")}>
                <Link href={hrefFor(l.id)} className="handwritten block text-lg text-ink-blue hover:underline" title={`${formatDate(l.date)} ${l.startTime}`}>
                  {formatDate(l.date).slice(0, 5)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id} className="h-11">
              <td className="pl-2 font-serif text-xs text-muted-foreground">{i + 1}</td>
              <td className="max-w-44 truncate pl-3"><PersonName user={s.person} nickClassName="text-sm" hideRealName /></td>
              {lessons.map((l) => {
                const a = attendance.get(key(l.id, s.id));
                const g = grades.get(key(l.id, s.id)) ?? [];
                return (
                  <td key={l.id} className={cn("border-l border-paper-line text-center", selectedId === l.id && "bg-brass/10")}>
                    {g.length > 0 ? (
                      <span className="handwritten text-2xl text-ink-red">{g.join(" ")}</span>
                    ) : a && a !== "PRESENT" ? (
                      <span className={cn("handwritten text-xl", a === "ABSENT" ? "text-ink-red" : a === "LATE" ? "text-ink-amber" : "text-ink-blue")}>
                        {ru.attendanceStatusShort[a]}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-muted-foreground">{ru.teacher.lessonLegend}</p>
    </div>
  );
}
