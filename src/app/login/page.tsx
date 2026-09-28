import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="absolute top-4 right-4 text-on-wood">
        <ThemeToggle />
      </div>
      {/* Кожаная обложка журнала с латунной табличкой */}
      <div className="leather stitched settle w-full max-w-md rounded-lg px-6 pt-10 pb-8 sm:px-10">
        <div className="relative z-10 mx-auto mb-8 w-fit">
          <div className="brass brass-plate flex items-center gap-3 px-5">
            <span className="screw" aria-hidden />
            <GraduationCap className="size-6 text-[#3a2710]" />
            <div className="text-center">
              <h1 className="engraved font-serif text-xl leading-tight font-bold">{ru.app.name}</h1>
              <p className="engraved text-xs font-bold tracking-wide uppercase">{ru.app.tagline}</p>
            </div>
            <span className="screw" aria-hidden />
          </div>
        </div>
        <div className="paper relative z-10 rounded-md p-6">
          <h2 className="font-serif text-xl font-bold">{ru.auth.title}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{ru.auth.subtitle}</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
        <p className="relative z-10 mt-5 text-center text-xs text-on-wood-muted">
          {ru.auth.demoTitle}: {ru.auth.demo}
        </p>
      </div>
    </div>
  );
}
