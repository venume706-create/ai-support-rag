import { db } from "@/lib/db";
import { BellMenu } from "./bell-menu";

const WHEN = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "Asia/Tashkent" });

/** Колокольчик администратора: уведомления безопасности (5 неудачных входов подряд). */
export async function NotificationBell({ userId, variant = "icon" }: { userId: string; variant?: "icon" | "row" }) {
  const [unread, latest] = await Promise.all([
    db.notification.count({ where: { userId, readAt: null } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, body: true, link: true, createdAt: true, readAt: true } }),
  ]);
  return (
    <BellMenu
      unread={unread}
      variant={variant}
      items={latest.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, when: WHEN.format(n.createdAt), unread: n.readAt === null }))}
    />
  );
}
