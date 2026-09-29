import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { requireOnboardingPageUser } from "@/lib/access";
import { ru } from "@/lib/i18n/ru";
import { ROLE_HOME } from "@/lib/roles";
import { WelcomeWizard } from "./wizard";

export const metadata: Metadata = { title: ru.welcome.title };

/** Мастер первого входа. Открывается автоматически, пока нет ника или пароль временный. */
export default async function WelcomePage() {
  const user = await requireOnboardingPageUser();
  if (!user.needsOnboarding) redirect(ROLE_HOME[user.role]);
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 text-on-wood">
        <ThemeToggle />
      </div>
      <div className="leather stitched settle w-full max-w-lg rounded-lg px-4 pt-9 pb-7 sm:px-8">
        <div className="relative z-10 mx-auto mb-6 w-fit max-w-full">
          <div className="brass brass-plate flex items-center gap-3 px-5">
            <GraduationCap className="size-6 shrink-0 text-[#3a2710]" />
            <div className="min-w-0 text-center">
              <h1 className="engraved font-serif text-lg leading-tight font-bold sm:text-xl">{ru.welcome.title}</h1>
              <p className="engraved text-xs font-bold">{ru.welcome.subtitle}</p>
            </div>
          </div>
        </div>
        <WelcomeWizard
          home={ROLE_HOME[user.role]}
          needNickname={!user.nickname}
          needPassword={user.mustChangePassword}
          person={{
            id: user.id,
            login: user.login,
            nickname: user.nickname,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarKey: user.avatarKey,
            avatarVersion: user.avatarVersion,
          }}
        />
      </div>
    </div>
  );
}
