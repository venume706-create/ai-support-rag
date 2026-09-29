import type { Role } from "@prisma/client";
import { Pencil } from "lucide-react";
import { ActiveBadge } from "@/components/common/badges";
import { Avatar } from "@/components/common/avatar";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileForm } from "@/components/profile/profile-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { tintClass } from "@/lib/appearance";
import { formatDate, toDateOnly } from "@/lib/dates";
import { ru } from "@/lib/i18n/ru";
import { nickOf, realNameOf, type PersonLike } from "@/lib/person";
import { cn } from "@/lib/utils";
import { DialogForm } from "./dialog-form";
import { ResetPasswordButton } from "./reset-password-button";
import { UserActions } from "./user-actions";

export interface AdminUser extends PersonLike {
  bio: string;
  phone: string;
  email: string;
  birthDate: Date | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}

/** Кнопки администратора над профилем: изменить профиль, сбросить пароль, заблокировать, удалить. */
export function AdminUserActions({
  user,
  role,
  entityId,
  subjects = [],
  subjectIds = [],
  parentPhone = "",
  showInLeaderboard = true,
}: {
  user: AdminUser;
  role: Role;
  entityId: string;
  subjects?: { id: string; name: string }[];
  subjectIds?: string[];
  parentPhone?: string;
  showInLeaderboard?: boolean;
}) {
  return (
    <>
      <DialogForm trigger={ru.admin.editProfile} title={ru.admin.editProfile} icon={<Pencil />} variant="outline" testId="edit-profile">
        <AvatarUploader user={user} />
        <ProfileForm
          mode="admin"
          role={role}
          subjects={subjects}
          user={{
            ...user,
            avatarFrame: user.avatarFrame ?? "none",
            cardColor: user.cardColor ?? "cream",
            birthDate: user.birthDate ? toDateOnly(user.birthDate) : "",
            showInLeaderboard,
            parentPhone,
            subjectIds,
          }}
        />
      </DialogForm>
      <ResetPasswordButton userId={user.id} nick={nickOf(user)} />
      <UserActions userId={user.id} isActive={user.isActive} name={nickOf(user)} kind={role === "TEACHER" ? "teacher" : "student"} entityId={entityId} />
    </>
  );
}

/** Карточка профиля для администратора: фото, ник, имя, «о себе», контакты (они видны только админу и самому человеку). */
export function AdminProfileCard({
  user,
  role,
  parentPhone,
  subjectNames,
}: {
  user: AdminUser;
  role: Role;
  parentPhone?: string;
  subjectNames?: string[];
}) {
  return (
    <Card className={cn(tintClass(user.cardColor))} data-testid="admin-profile-card">
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-serif text-2xl font-bold" data-testid="profile-nick">
              {nickOf(user)}
            </p>
            <p className="truncate text-sm text-muted-foreground" data-testid="profile-realname">
              {realNameOf(user)}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <ActiveBadge active={user.isActive} />
              {!user.nickname && <Badge variant="warning">{ru.admin.notOnboarded}</Badge>}
              {user.mustChangePassword && user.nickname && <Badge variant="warning">{ru.admin.tempPasswordActive}</Badge>}
            </div>
          </div>
        </div>
        {user.bio && <p className="rounded-md bg-black/[0.04] p-3 text-sm whitespace-pre-line dark:bg-white/[0.05]">{user.bio}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{ru.admin.login}</dt>
          <dd className="font-bold">{user.login}</dd>
          {role === "TEACHER" && subjectNames && (
            <>
              <dt className="text-muted-foreground">{ru.common.subjects}</dt>
              <dd>{subjectNames.join(", ") || ru.common.dash}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{ru.common.phone}</dt>
          <dd>{user.phone || ru.common.dash}</dd>
          <dt className="text-muted-foreground">{ru.profile.email}</dt>
          <dd className="break-all">{user.email || ru.common.dash}</dd>
          <dt className="text-muted-foreground">{ru.common.birthDate}</dt>
          <dd>{user.birthDate ? formatDate(user.birthDate) : ru.common.dash}</dd>
          {role === "STUDENT" && (
            <>
              <dt className="text-muted-foreground">{ru.common.parentPhone}</dt>
              <dd>{parentPhone || ru.common.dash}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{ru.common.createdAt}</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">{ru.admin.contactsHint}</p>
      </CardContent>
    </Card>
  );
}
