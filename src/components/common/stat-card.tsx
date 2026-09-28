/** Показатель дашборда — механический счётчик в латунной рамке. */
export function StatCard({ label, value, icon, suffix }: { label: string; value: number | string; icon: React.ReactNode; suffix?: string }) {
  const digits = String(value).split("");
  return (
    <div className="paper flex flex-col gap-3 rounded-md p-4" data-testid="stat-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-brass-dark dark:text-brass">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="counter-frame brass" aria-label={`${value}${suffix ?? ""}`} role="img">
          {digits.map((d, i) => (
            <span key={i} className="counter-digit" aria-hidden>
              {d}
            </span>
          ))}
        </span>
        {suffix && <span className="pb-1 font-serif text-lg font-bold">{suffix}</span>}
      </div>
    </div>
  );
}
