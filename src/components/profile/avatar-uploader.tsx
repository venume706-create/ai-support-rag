"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { AVATAR_MAX_BYTES } from "@/lib/avatar-shared";
import { ru } from "@/lib/i18n/ru";
import type { PersonLike } from "@/lib/person";
import { AvatarCropper } from "./avatar-cropper";

const ACCEPT = "image/jpeg,image/png,image/webp";

/** Фото профиля: выбрать (камера или галерея на телефоне, файл на ПК), обрезать в круг, убрать. */
export function AvatarUploader({
  user,
  onChanged,
  refresh = true,
}: {
  user: PersonLike;
  /** Вызывается после успешной загрузки/удаления (мастер первого входа обновляет превью сам) */
  onChanged?: (hasPhoto: boolean, version: number) => void;
  refresh?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [current, setCurrent] = useState({ key: user.avatarKey, version: user.avatarVersion });
  const [removing, setRemoving] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return void toast.error(ru.profile.photoBadType);
    if (f.size > AVATAR_MAX_BYTES) return void toast.error(ru.profile.photoTooBig);
    setFile(f);
  }

  async function upload(blob: Blob) {
    const form = new FormData();
    form.set("file", blob, "avatar.webp");
    const res = await fetch(`/api/users/${user.id}/avatar`, { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string; url?: string };
    if (!res.ok) {
      toast.error(body.error ?? ru.profile.photoFailed);
      return;
    }
    const version = Number(new URL(body.url!, window.location.origin).searchParams.get("v"));
    setCurrent({ key: "set", version });
    setFile(null);
    toast.success(body.message ?? ru.profile.photoSaved);
    onChanged?.(true, version);
    if (refresh) router.refresh();
  }

  async function remove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) return void toast.error(body.error ?? ru.profile.photoFailed);
      setCurrent((c) => ({ key: null, version: c.version + 1 }));
      toast.success(body.message ?? ru.profile.photoRemoved);
      onChanged?.(false, current.version + 1);
      if (refresh) router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <Avatar user={{ ...user, avatarKey: current.key, avatarVersion: current.version }} size="xl" />
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={pick} data-testid="avatar-input" aria-label={ru.profile.photoChange} tabIndex={-1} />
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => input.current?.click()} data-testid="avatar-choose">
            <Camera /> {ru.profile.photoChange}
          </Button>
          {current.key && (
            <Button type="button" variant="outline" onClick={remove} disabled={removing} data-testid="avatar-remove">
              <Trash2 /> {ru.profile.photoRemove}
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground sm:text-left">{ru.profile.photoHint}</p>
      </div>
      <AvatarCropper file={file} onCancel={() => setFile(null)} onDone={upload} />
    </div>
  );
}
