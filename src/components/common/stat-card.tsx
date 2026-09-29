/** Показатель дашборда — механический счётчик: колёсики с цифрами прокручиваются до значения. */
function Digit({ char, index }: { char: string; index: number }) {
  const isDigit = /^[0-9]$/.test(char);
  return (
    <span className="counter-digit items-start! justify-start! overflow-hidden" aria-hidden>
      {isDigit ? (
        // Колонка из десяти цифр; окно показывает одну. --d — нужная цифра, --i — задержка для «раскрутки» слева направо
        <span className="odometer-strip" style={{ ["--d" as string]: char, ["--i" as string]: index, height: "1000%" }}>
          {Array.from({ length: 10 }, (_, n) => (
            <span key={n} className="flex h-[10%] items-center justify-center leading-none">
              {n}
            </span>
          ))}
        </span>
      ) : (
        char
      )}
    </span>
  );
}

export function StatCard({ label, value, icon, suffix }: { label: string; value: number | string; icon: React.ReactNode; suffix?: string }) {
  const chars = String(value).split("");
  return (
    <div className="paper flex flex-col gap-3 rounded-md p-4" data-testid="stat-card" data-value={value}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-brass-dark dark:text-brass">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="counter-frame brass" aria-label={`${value}${suffix ?? ""}`} role="img">
          {chars.map((c, i) => (
            <Digit key={i} char={c} index={i} />
          ))}
        </span>
        {suffix && <span className="pb-1 font-serif text-lg font-bold">{suffix}</span>}
      </div>
    </div>
  );
}
