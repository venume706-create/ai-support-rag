import { db } from "@/lib/db";
import { clientIp, consecutiveFailures, describeDevice, shouldRaiseAlert } from "@/lib/security-rules";

const KEEP_ATTEMPTS_DAYS = 90;

/**
 * Записывает попытку входа и, если на аккаунт набралось 5 неудачных подряд,
 * создаёт уведомление безопасности всем администраторам.
 * НИКОГО не блокирует и ничего не замедляет: вход решается только паролем.
 * Любая ошибка здесь не должна влиять на вход, поэтому наружу не пробрасывается.
 */
export async function recordLoginAttempt(input: { login: string; userId: string | null; success: boolean; headers?: { get(name: string): string | null } }): Promise<void> {
  try {
    const device = describeDevice(input.headers?.get("user-agent"));
    const ip = input.headers ? clientIp(input.headers) : "";
    await db.loginAttempt.create({ data: { login: input.login.slice(0, 64), userId: input.userId, success: input.success, device, ip } });
    if (input.success || !input.userId) return;
    await raiseAlertIfNeeded(input.userId, input.login, device, ip);
    // Старые записи не копим
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_ATTEMPTS_DAYS * 86_400_000) } } });
  } catch (error) {
    console.error("Не удалось записать попытку входа", error);
  }
}

async function raiseAlertIfNeeded(userId: string, login: string, device: string, ip: string) {
  const [lastOk, lastResolved, open] = await Promise.all([
    db.loginAttempt.findFirst({ where: { userId, success: true }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.securityAlert.findFirst({ where: { userId, status: "RESOLVED" }, orderBy: { resolvedAt: "desc" }, select: { resolvedAt: true } }),
    db.securityAlert.findFirst({ where: { userId, status: "OPEN" }, select: { id: true } }),
  ]);
  const notBefore = [lastOk?.createdAt, lastResolved?.resolvedAt].filter((d): d is Date => Boolean(d)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const recent = await db.loginAttempt.findMany({
    where: { userId, createdAt: notBefore ? { gt: notBefore } : undefined },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { success: true, createdAt: true },
  });
  const failures = consecutiveFailures(recent, notBefore);
  if (!shouldRaiseAlert(failures)) return;
  const first = recent[Math.min(failures, recent.length) - 1]?.createdAt ?? new Date();
  const now = new Date();

  if (open) {
    await db.securityAlert.update({ where: { id: open.id }, data: { attempts: failures, lastAt: now, device, ip } });
    return;
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { nickname: true, login: true } });
  const who = user?.nickname ?? user?.login ?? login;
  const alert = await db.securityAlert.create({ data: { userId, login, attempts: failures, firstAt: first, lastAt: now, device, ip } });
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "login_alert",
      title: `Неудачные входы в аккаунт «${who}»`,
      body: `Попыток подряд: ${failures}. Устройство: ${device}.`,
      link: `/admin/security#${alert.id}`,
    })),
  });
}
