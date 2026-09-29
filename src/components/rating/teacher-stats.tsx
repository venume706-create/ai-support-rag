import { Progress } from "@/components/ui/progress";
import { ru } from "@/lib/i18n/ru";
import { ratingLevel } from "@/lib/rating";
import { cn } from "@/lib/utils";

const BAR = { high: "bg-[#2e8b57]", medium: "bg-[#d4a017]", low: "bg-[#c0392b]", none: "bg-transparent" };

function Meter({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold">{label}</span>
        <span className={cn("tabular-nums", value === null && "text-muted-foreground")}>{value === null ? ru.common.noData : ru.rating.percent(value)}</span>
      </div>
      <Progress value={value ?? 0} indicatorClassName={BAR[ratingLevel(value)]} label={label} />
    </div>
  );
}

/** Посещаемость и доля сданных ДЗ по всем группам учителя (в дополнение к среднему рейтингу учеников). */
export function TeacherStats({ attendancePercent, homeworkPercent }: { attendancePercent: number | null; homeworkPercent: number | null }) {
  return (
    <div className="grid w-full gap-3" data-testid="teacher-stats">
      <Meter label={ru.rating.teacherAttendance} value={attendancePercent} />
      <Meter label={ru.rating.teacherHomework} value={homeworkPercent} />
    </div>
  );
}
