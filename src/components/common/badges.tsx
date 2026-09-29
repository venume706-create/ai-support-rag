import type { AttendanceStatus, HomeworkStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ru } from "@/lib/i18n/ru";
import { ratingLevel } from "@/lib/rating";

const RATING_VARIANT = { high: "success", medium: "warning", low: "danger", none: "outline" } as const;

export function RatingBadge({ value }: { value: number | null }) {
  const level = ratingLevel(value);
  return (
    <Badge variant={RATING_VARIANT[level]} className="tabular-nums" data-rating-level={level}>
      {value === null ? ru.common.noData : value.toFixed(1)}
    </Badge>
  );
}

const ATTENDANCE_VARIANT: Record<AttendanceStatus, "success" | "warning" | "danger" | "info"> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "danger",
  EXCUSED: "info",
};

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <Badge variant={ATTENDANCE_VARIANT[status]}>{ru.attendanceStatusFull[status]}</Badge>;
}

const HOMEWORK_VARIANT = { DONE: "success", PARTIAL: "warning", NOT_DONE: "danger", PENDING: "outline" } as const;

export function HomeworkBadge({ status }: { status: HomeworkStatus | "PENDING" }) {
  return <Badge variant={HOMEWORK_VARIANT[status]}>{ru.homeworkStatus[status]}</Badge>;
}

export function GradeBadge({ value }: { value: number }) {
  const variant = value >= 5 ? "success" : value === 4 ? "info" : value === 3 ? "warning" : "danger";
  return (
    <Badge variant={variant} className="min-w-7 justify-center text-sm tabular-nums">
      {value}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "outline"}>{active ? ru.common.active : ru.common.inactive}</Badge>;
}

const HW_STATE_VARIANT = { done: "success", partial: "warning", overdue: "danger", today: "warning", soon: "info", later: "outline" } as const;

/** Состояние задания по отметке и сроку: «Просрочено», «Сдать сегодня», «Скоро срок»… */
export function HomeworkStateBadge({ state }: { state: keyof typeof HW_STATE_VARIANT }) {
  return (
    <Badge variant={HW_STATE_VARIANT[state]} data-hw-state={state}>
      {ru.hw[state]}
    </Badge>
  );
}
