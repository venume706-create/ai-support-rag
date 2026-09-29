const FIELD_LABELS: Record<string, string> = {
  firstName: "имя",
  lastName: "фамилия",
  nickname: "ник",
  login: "логин",
  phone: "телефон",
  email: "почта",
  bio: "о себе",
  birthDate: "дата рождения",
  parentPhone: "телефон родителя",
  avatarFrame: "рамка",
  cardColor: "цвет карточки",
  showInLeaderboard: "доска почёта",
  subjectIds: "предметы",
  role: "роль",
  name: "имя",
  created: "создано",
};

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "пусто";
  if (typeof value === "boolean") return value ? "да" : "нет";
  return String(value);
}

/**
 * Человеческое описание поля details журнала: «ник: Вася → Петя; телефон: изменено».
 * Не JSON — как есть; пусто — пустая строка.
 */
export function describeDetails(raw: string): string {
  if (!raw) return "";
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return raw;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) return raw;
  return Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => {
      const label = FIELD_LABELS[key] ?? key;
      if (Array.isArray(value) && value.length === 2) return `${label}: ${show(value[0])} → ${show(value[1])}`;
      return `${label}: ${show(value)}`;
    })
    .join("; ");
}
