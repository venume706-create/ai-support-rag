import { NextResponse } from "next/server";
import { apiSession } from "@/lib/access";
import { AvatarError, processAvatar } from "@/lib/avatar";
import { AVATAR_MAX_BYTES } from "@/lib/avatar-shared";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ru } from "@/lib/i18n/ru";
import { getStorage } from "@/lib/storage";

/** Фото видят все вошедшие (это часть публичного профиля). Ссылка содержит версию, поэтому кэшируется надолго. */
export async function GET(_req: Request, ctx: RouteContext<"/api/users/[id]/avatar">) {
  const session = await apiSession();
  if (session instanceof NextResponse) return session;
  const { id } = await ctx.params;
  const user = await db.user.findUnique({ where: { id }, select: { avatarKey: true } });
  if (!user?.avatarKey) return new NextResponse(null, { status: 404 });
  const file = await getStorage().get(user.avatarKey);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

const ERRORS: Record<AvatarError["code"], { status: number; message: string }> = {
  type: { status: 415, message: ru.profile.photoBadType },
  size: { status: 413, message: ru.profile.photoTooBig },
  invalid: { status: 422, message: ru.profile.photoBroken },
};

/** Загрузить фото: себе — любой, любому — администратор. */
export async function POST(req: Request, ctx: RouteContext<"/api/users/[id]/avatar">) {
  const session = await apiSession();
  if (session instanceof NextResponse) return session;
  const { id } = await ctx.params;
  if (id !== session.id && session.role !== "ADMIN") return NextResponse.json({ error: ru.errors.forbidden }, { status: 403 });
  if (id !== session.id && session.needsOnboarding) return NextResponse.json({ error: ru.errors.finishProfileFirst }, { status: 403 });

  const target = await db.user.findUnique({ where: { id }, select: { id: true, avatarKey: true, avatarVersion: true, nickname: true, login: true } });
  if (!target) return NextResponse.json({ error: ru.errors.notFound }, { status: 404 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > AVATAR_MAX_BYTES + 64 * 1024) return NextResponse.json({ error: ru.profile.photoTooBig }, { status: 413 });
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: ru.profile.photoBroken }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: ru.profile.photoBroken }, { status: 400 });
  if (file.size > AVATAR_MAX_BYTES) return NextResponse.json({ error: ru.profile.photoTooBig }, { status: 413 });

  let processed: Buffer;
  try {
    processed = await processAvatar(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof AvatarError) return NextResponse.json({ error: ERRORS[error.code].message }, { status: ERRORS[error.code].status });
    throw error;
  }

  const version = target.avatarVersion + 1;
  const key = `avatars/${target.id}-${version}.webp`;
  const storage = getStorage();
  await storage.put(key, processed, "image/webp");
  await db.user.update({ where: { id }, data: { avatarKey: key, avatarVersion: version } });
  if (target.avatarKey) await storage.delete(target.avatarKey).catch((e) => console.error("Не удалось удалить старое фото", e));
  if (id !== session.id) await writeAudit(session, "avatar_changed", { type: "user", id, label: target.nickname ?? target.login });
  return NextResponse.json({ ok: true, url: `/api/users/${id}/avatar?v=${version}`, message: ru.profile.photoSaved });
}

/** Убрать фото: себе — любой, любому — администратор. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/users/[id]/avatar">) {
  const session = await apiSession();
  if (session instanceof NextResponse) return session;
  const { id } = await ctx.params;
  if (id !== session.id && session.role !== "ADMIN") return NextResponse.json({ error: ru.errors.forbidden }, { status: 403 });
  const target = await db.user.findUnique({ where: { id }, select: { avatarKey: true, avatarVersion: true, nickname: true, login: true } });
  if (!target) return NextResponse.json({ error: ru.errors.notFound }, { status: 404 });
  if (target.avatarKey) {
    await db.user.update({ where: { id }, data: { avatarKey: null, avatarVersion: target.avatarVersion + 1 } });
    await getStorage().delete(target.avatarKey).catch((e) => console.error("Не удалось удалить фото", e));
    if (id !== session.id) await writeAudit(session, "avatar_removed", { type: "user", id, label: target.nickname ?? target.login });
  }
  return NextResponse.json({ ok: true, message: ru.profile.photoRemoved });
}
