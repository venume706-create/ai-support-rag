export const PAGE_SIZE = 10;

export function paginate(total: number, requestedPage: number, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pages);
  return { page, pages, skip: (page - 1) * pageSize, take: pageSize, total, pageSize };
}

export type PageInfo = ReturnType<typeof paginate>;

/** Параметры номера страницы: основной список и списки истории ученика. */
const PAGE_KEYS = new Set(["page", "gp", "ap", "hp", "sp"]);

/** Номер страницы из searchParams (некорректное значение → 1). */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Ссылка на ту же страницу с изменёнными параметрами запроса. */
export function withParams(
  pathname: string,
  current: Record<string, string | number | undefined>,
  patch: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value !== undefined && value !== "" && !(PAGE_KEYS.has(key) && Number(value) === 1)) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Поиск без учёта регистра и пагинация небольшого списка в памяти. */
export function searchAndPage<T>(items: T[], q: string, page: number, text: (item: T) => string, pageSize = PAGE_SIZE) {
  const term = q.trim().toLowerCase().replace(/ё/g, "е");
  const filtered = term ? items.filter((item) => text(item).toLowerCase().replace(/ё/g, "е").includes(term)) : items;
  const info = paginate(filtered.length, page, pageSize);
  return { info, rows: filtered.slice(info.skip, info.skip + info.take), total: filtered.length };
}
