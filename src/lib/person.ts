/** Поля пользователя, нужные, чтобы показать человека в интерфейсе (ник, имя, фото). */
export const PERSON_SELECT = {
  id: true,
  login: true,
  nickname: true,
  firstName: true,
  lastName: true,
  avatarKey: true,
  avatarVersion: true,
  avatarFrame: true,
  cardColor: true,
} as const;

export interface PersonLike {
  id: string;
  login: string;
  nickname: string | null;
  firstName: string;
  lastName: string;
  avatarKey: string | null;
  avatarVersion: number;
  avatarFrame?: string;
  cardColor?: string;
}

/** Главное имя человека: ник, а пока его нет — логин. */
export function nickOf(p: Pick<PersonLike, "nickname" | "login">): string {
  return p.nickname ?? p.login;
}

/** Имя и фамилия — для второго плана. */
export function realNameOf(p: Pick<PersonLike, "firstName" | "lastName">): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

/** Профиль целиком — для администратора (включая контакты). */
export const ADMIN_USER_SELECT = {
  ...PERSON_SELECT,
  bio: true,
  phone: true,
  email: true,
  birthDate: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
} as const;
