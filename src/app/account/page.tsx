import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: ru.account.title };

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageHeader title={ru.account.title} description={`${user.fullName} · ${user.login} · ${ru.roles[user.role]}`} />
      <div className="grid max-w-3xl gap-6 md:grid-cols-[1fr_260px]">
        <Card>
          <CardHeader>
            <CardTitle>{ru.account.title}</CardTitle>
            <CardDescription>{ru.account.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.account.securityTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{ru.account.securityHint}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
