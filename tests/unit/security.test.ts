import { describe, expect, it } from "vitest";
import { LOGIN_ALERT_THRESHOLD, clientIp, consecutiveFailures, describeDevice, shouldRaiseAlert } from "@/lib/security-rules";

const at = (min: number, success = false) => ({ success, createdAt: new Date(Date.UTC(2026, 8, 29, 10, min)) });

describe("consecutiveFailures", () => {
  it("считает неудачи подряд до последнего успешного входа", () => {
    expect(consecutiveFailures([at(0, true), at(1), at(2), at(3)])).toBe(3);
    expect(consecutiveFailures([at(0), at(1), at(2, true), at(3), at(4)])).toBe(2);
    expect(consecutiveFailures([at(0), at(1, true)])).toBe(0);
    expect(consecutiveFailures([])).toBe(0);
  });
  it("порядок входных данных не важен", () => {
    expect(consecutiveFailures([at(4), at(0, true), at(2), at(3)])).toBe(3);
  });
  it("решение администратора (notBefore) начинает серию заново", () => {
    const attempts = [at(1), at(2), at(3), at(4), at(5), at(6)];
    expect(consecutiveFailures(attempts)).toBe(6);
    expect(consecutiveFailures(attempts, at(4).createdAt)).toBe(2);
    expect(consecutiveFailures(attempts, at(6).createdAt)).toBe(0);
  });
});

describe("shouldRaiseAlert", () => {
  it("порог — ровно 5", () => {
    expect(LOGIN_ALERT_THRESHOLD).toBe(5);
    expect(shouldRaiseAlert(4)).toBe(false);
    expect(shouldRaiseAlert(5)).toBe(true);
    expect(shouldRaiseAlert(9)).toBe(true);
  });
});

describe("describeDevice / clientIp", () => {
  it("узнаёт популярные браузеры и системы", () => {
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iPhone");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0")).toBe("Edge · Windows");
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36")).toBe("Chrome · Android");
    expect(describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/121.0")).toBe("Firefox · macOS");
    expect(describeDevice("")).toBe("Неизвестное устройство");
    expect(describeDevice(null)).toBe("Неизвестное устройство");
  });
  it("берёт первый IP и не пропускает мусор", () => {
    const h = (v: Record<string, string>) => ({ get: (n: string) => v[n] ?? null });
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(h({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIp(h({ "x-forwarded-for": "<script>1.2.3.4" }))).toBe("");
    expect(clientIp(h({}))).toBe("");
  });
});
