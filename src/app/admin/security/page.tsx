import type { Metadata } from "next";
import { Clock, MonitorSmartphone, Network } from "lucide-react";
import { AlertActions } from "@/components/admin/alert-actions";
import { LinkTabs } from "@/components/common/link-tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/status-views";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: ru.security.title };

const WHEN = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "Asia/Tashkent" });
const TIME = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "Asia/Tashkent" });

export default async function AdminSecurityPage({ searchParams }: PageProps<"/admin/security">) {
  const sp = await searchParams;
  const tab = sp.tab === "resolved" ? "resolved" : "open";
  const t = ru.security;
  const [alerts, openCount, resolvedCount] = await Promise.all([
    db.securityAlert.findMany({ where: { status: tab === "open" ? "OPEN" : "RESOLVED" }, orderBy: tab === "open" ? { lastAt: "desc" } : { resolvedAt: "desc" }, take: 50 }),
    db.securityAlert.count({ where: { status: "OPEN" } }),
    db.securityAlert.count({ where: { status: "RESOLVED" } }),
  ]);
  const [users, resolvers] = await Promise.all([
    db.user.findMany({ where: { id: { in: alerts.map((a) => a.userId) } }, select: { id: true, login: true, nickname: true, isActive: true } }),
    db.user.findMany({ where: { id: { in: alerts.map((a) => a.resolvedById).filter((x): x is string => Boolean(x)) } }, select: { id: true, login: true, nickname: true } }),
  ]);
  const tabs = [
    { key: "open", label: t.open, count: openCount, href: "/admin/security" },
    { key: "resolved", label: t.resolved, count: resolvedCount, href: "/admin/security?tab=resolved" },
  ] as const;

  return (
    <>
      <PageHeader title={t.title} description={t.description} hint={ru.security.hint} />
      <LinkTabs className="mb-4" label={t.title} testId="security-tabs" items={tabs.map((x) => ({ href: x.href, label: x.label, count: x.count, active: tab === x.key }))} />
      {alerts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState kind="star" text={tab === "open" ? t.emptyOpen : t.emptyResolved} />
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4" data-testid="alert-list">
          {alerts.map((a) => {
            const user = users.find((u) => u.id === a.userId);
            const nick = user?.nickname ?? user?.login ?? a.login;
            const resolver = resolvers.find((u) => u.id === a.resolvedById);
            const isOpen = a.status === "OPEN";
            return (
              <li key={a.id} id={a.id} data-testid="alert" data-status={a.status} data-login={a.login}>
                <Card className={cn(isOpen && "ring-2 ring-ink-red/50")}>
                  <CardContent className="grid gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-serif text-xl font-bold break-words">
                          {nick}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ru.common.login}: {a.login}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isOpen ? "danger" : "success"} data-testid="alert-attempts">
                          {t.attempts(a.attempts)}
                        </Badge>
                        {user && !user.isActive && <Badge variant="warning">{t.blockedNow}</Badge>}
                      </div>
                    </div>
                    <dl className="grid gap-2 text-sm sm:grid-cols-3">
                      <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <dt className="text-xs text-muted-foreground">{t.period}</dt>
                          <dd className="tabular-nums">
                            {WHEN.format(a.firstAt)} — {TIME.format(a.lastAt)}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <dt className="text-xs text-muted-foreground">{t.device}</dt>
                          <dd>{a.device || ru.common.dash}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Network className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <dt className="text-xs text-muted-foreground">{t.ip}</dt>
                          <dd className="tabular-nums">{a.ip || t.unknownIp}</dd>
                        </div>
                      </div>
                    </dl>
                    {!isOpen && (
                      <p className="text-sm text-muted-foreground" data-testid="alert-resolution">
                        {a.resolution === "PASSWORD_RESET" ? t.resolvedReset : a.resolution === "BLOCKED" ? t.resolvedBlocked : t.resolvedOk}
                        {a.resolvedAt && ` · ${WHEN.format(a.resolvedAt)}`}
                        {resolver && ` · ${t.resolvedBy(resolver.nickname ?? resolver.login)}`}
                      </p>
                    )}
                    <AlertActions alertId={a.id} nick={nick} open={isOpen} blockedNow={Boolean(user && !user.isActive)} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
