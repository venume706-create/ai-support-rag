/** Оформление профиля ученика: рамка аватара и цвет карточки. */
export const AVATAR_FRAMES = ["none", "brass", "wood", "rope", "royal"] as const;
export const CARD_COLORS = ["cream", "sky", "mint", "rose", "lilac"] as const;

export type AvatarFrame = (typeof AVATAR_FRAMES)[number];
export type CardColor = (typeof CARD_COLORS)[number];

export function asFrame(value: string): AvatarFrame {
  return (AVATAR_FRAMES as readonly string[]).includes(value) ? (value as AvatarFrame) : "none";
}

export function asCardColor(value: string): CardColor {
  return (CARD_COLORS as readonly string[]).includes(value) ? (value as CardColor) : "cream";
}

/** CSS-класс цвета карточки (cream — стандартная бумага, без переопределения). */
export function tintClass(color: string | undefined): string {
  const c = asCardColor(color ?? "cream");
  return c === "cream" ? "" : `tint-${c}`;
}
