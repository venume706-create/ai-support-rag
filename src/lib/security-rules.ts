/**
 * Правила уведомлений безопасности. Блокировок по ним НЕТ: 5 неудачных входов подряд
 * только присылают уведомление администратору, решает он сам.
 */
export const LOGIN_ALERT_THRESHOLD = 5;

/**
 * Сколько неудачных входов подряд на аккаунт «сейчас».
 * Серию обрывают успешный вход и решение администратора по прошлой тревоге (notBefore).
 * attempts — любые попытки этого аккаунта в любом порядке.
 */
export function consecutiveFailures(attempts: Array<{ success: boolean; createdAt: Date }>, notBefore?: Date | null): number {
  const sorted = [...attempts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  let count = 0;
  for (const a of sorted) {
    if (notBefore && a.createdAt <= notBefore) break;
    if (a.success) break;
    count += 1;
  }
  return count;
}

export function shouldRaiseAlert(failures: number): boolean {
  return failures >= LOGIN_ALERT_THRESHOLD;
}

/** «Chrome · Windows» из User-Agent: без версий, чтобы админ сразу понял, что за устройство. */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? "").slice(0, 400);
  if (!ua) return "Неизвестное устройство";
  const browser = /YaBrowser/i.test(ua)
    ? "Яндекс Браузер"
    : /Edg(e|A|iOS)?\//i.test(ua)
      ? "Edge"
      : /OPR\/|Opera/i.test(ua)
        ? "Opera"
        : /SamsungBrowser/i.test(ua)
          ? "Samsung Internet"
          : /Firefox|FxiOS/i.test(ua)
            ? "Firefox"
            : /Chrome|CriOS/i.test(ua)
              ? "Chrome"
              : /Safari/i.test(ua)
                ? "Safari"
                : /curl|python|node|axios|okhttp|bot/i.test(ua)
                  ? "Программа"
                  : "Браузер";
  const os = /iPhone/i.test(ua)
    ? "iPhone"
    : /iPad/i.test(ua)
      ? "iPad"
      : /Android/i.test(ua)
        ? "Android"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/i.test(ua)
            ? "macOS"
            : /Linux|X11/i.test(ua)
              ? "Linux"
              : "";
  return os ? `${browser} · ${os}` : browser;
}

/** Первый адрес из X-Forwarded-For (или X-Real-IP). Пусто, если заголовков нет или это не адрес. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const raw = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "";
  // Только настоящий вид адреса; всё остальное (подделанный заголовок) отбрасываем целиком
  return /^[0-9a-fA-F:.]{2,45}$/.test(raw) ? raw : "";
}
