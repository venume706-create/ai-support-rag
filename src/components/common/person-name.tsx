import { nickOf, realNameOf, type PersonLike } from "@/lib/person";
import { cn } from "@/lib/utils";
import { Avatar, type AvatarSize } from "./avatar";

/**
 * Человек в интерфейсе: НИК — главное имя (крупно, первым), имя и фамилия — вторым планом
 * (мелко, серым, под ником). Фото — по желанию.
 */
export function PersonName({
  user,
  avatar,
  className,
  nickClassName,
  hideRealName = false,
  inline = false,
}: {
  user: PersonLike;
  avatar?: AvatarSize;
  className?: string;
  nickClassName?: string;
  /** Не показывать имя и фамилию (например, в доске почёта — только ник) */
  hideRealName?: boolean;
  /** В одну строку: «Ник · Имя Фамилия» (для подписей и выпадающих списков) */
  inline?: boolean;
}) {
  const real = realNameOf(user);
  const text = (
    <span className={cn("min-w-0", inline ? "inline" : "flex flex-col leading-tight")}>
      <span className={cn("truncate font-bold", nickClassName)} data-testid="person-nick">
        {nickOf(user)}
      </span>
      {!hideRealName && real && (
        <span className={cn("truncate text-xs font-normal text-muted-foreground", inline && "ml-1.5")} data-testid="person-realname">
          {inline ? `· ${real}` : real}
        </span>
      )}
    </span>
  );
  if (!avatar) return <span className={cn("min-w-0", className)}>{text}</span>;
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar user={user} size={avatar} />
      {text}
    </span>
  );
}
