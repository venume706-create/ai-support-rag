import { cn } from "@/lib/utils";

/** Маленькая шкала прибора: латунная рамка, деления, цветная заливка. */
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
      className={cn("brass relative h-3.5 w-full overflow-hidden rounded-full p-[2px]", className)}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full bg-[#1f160f] shadow-[inset_0_1px_2px_rgb(0_0_0/0.8)]">
        <div
          className={cn("bar-fill h-full rounded-full bg-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]", indicatorClassName)}
          style={{ width: `${clamped}%` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgb(255 240 200 / 0.35) calc(10% - 1px) 10%)" }}
        />
      </div>
    </div>
  );
}

export { Progress };
