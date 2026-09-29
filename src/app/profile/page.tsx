import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/access";
import { toDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: ru.profile.title };

export default async function ProfilePage() {
  const me = await requirePageUser();
  const u = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    include: { student: { select: { showInLeaderboard: true } } },
  });
  const person = {
    id: u.id,
    login: u.login,
    nickname: u.nickname,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarKey: u.avatarKey,
    avatarVersion: u.avatarVersion,
    avatarFrame: u.avatarFrame,
    cardColor: u.cardColor,
  };
  return (
    <>
      <PageHeader title={ru.profile.title} description={ru.profile.subtitle} />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{ru.profile.photo}</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarUploader user={person} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{ru.profile.title}</CardTitle>
            <CardDescription>
              {ru.profile.role}: {ru.roles[u.role]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              mode="self"
              role={u.role}
              user={{
                ...person,
                bio: u.bio,
                phone: u.phone,
                email: u.email,
                birthDate: u.birthDate ? toDateOnly(u.birthDate) : "",
                showInLeaderboard: u.student?.showInLeaderboard ?? true,
                parentPhone: "",
                subjectIds: [],
              }}
            />
          </CardContent>
        </Card>
        <Card id="password">
          <CardHeader>
            <CardTitle>{ru.account.title}</CardTitle>
            <CardDescription>{ru.account.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
