import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { ROLE_HOME } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: ru.auth.title };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const sp = await searchParams;
  const callbackUrl = typeof sp.callbackUrl === "string" && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "";

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">{ru.app.name}</h1>
            <p className="text-sm text-muted-foreground">{ru.app.tagline}</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{ru.auth.title}</CardTitle>
            <CardDescription>{ru.auth.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl} />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {ru.auth.demoTitle}: {ru.auth.demo}
        </p>
      </div>
    </div>
  );
}
