import { cn } from "@/lib/utils";

function Progress({
  value,
  className,
  indicatorClassName,
  label,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-primary/15", className)}
    >
      <div className={cn("h-full rounded-full bg-primary transition-all", indicatorClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export { Progress };
