import { asFrame } from "@/lib/appearance";
import { avatarUrl } from "@/lib/avatar-shared";
import { nickOf, type PersonLike } from "@/lib/person";
import { cn } from "@/lib/utils";

const SIZES = { xs: 28, sm: 36, md: 48, lg: 80, xl: 128 } as const;
export type AvatarSize = keyof typeof SIZES;

// Материалы заглушки: латунь, кожа, дерево, зелёное сукно, синие чернила
const PLACEHOLDERS = [
  "from-[#ecd08f] to-[#9a6f25] text-[#2b1d14]",
  "from-[#a56a45] to-[#4a2916] text-[#f5efe0]",
  "from-[#8a5a35] to-[#3a2415] text-[#f5efe0]",
  "from-[#4f8a63] to-[#1f4a34] text-[#f5efe0]",
  "from-[#4a72b0] to-[#1f3a6b] text-[#f5efe0]",
];

function hash(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Круглое фото с рамкой; без фото — красивая заглушка с первой буквой ника. */
export function Avatar({
  user,
  size = "md",
  className,
  frame,
}: {
  user: Pick<PersonLike, "id" | "login" | "nickname" | "avatarKey" | "avatarVersion"> & { avatarFrame?: string };
  size?: AvatarSize;
  className?: string;
  /** Рамка; по умолчанию — выбранная самим человеком */
  frame?: string;
}) {
  const px = SIZES[size];
  const url = avatarUrl(user);
  const letter = ([...nickOf(user)][0] ?? "?").toUpperCase();
  const f = asFrame(frame ?? user.avatarFrame ?? "none");
  return (
    <span
      className={cn("avatar-frame relative inline-flex shrink-0 rounded-full", `avatar-frame-${f}`, className)}
      style={{ width: px, height: px }}
      data-testid="avatar"
      data-has-photo={url ? "true" : "false"}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- фото за авторизацией: оптимизатор next/image не передаёт cookie сессии
        <img src={url} alt="" width={px} height={px} loading="lazy" decoding="async" className="size-full rounded-full object-cover" />
      ) : (
        <span
          aria-hidden
          className={cn("flex size-full items-center justify-center rounded-full bg-gradient-to-br font-serif font-bold shadow-inner", PLACEHOLDERS[hash(user.id) % PLACEHOLDERS.length])}
          style={{ fontSize: Math.round(px * 0.44) }}
        >
          {letter}
        </span>
      )}
    </span>
  );
}
