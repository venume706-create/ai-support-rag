export const PAGE_SIZE = 10;

export function paginate(total: number, requestedPage: number, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pages);
  return { page, pages, skip: (page - 1) * pageSize, take: pageSize, total, pageSize };
}

export type PageInfo = ReturnType<typeof paginate>;

/** Ссылка на ту же страницу с изменёнными параметрами запроса. */
export function withParams(
  pathname: string,
  current: Record<string, string | number | undefined>,
  patch: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value !== undefined && value !== "" && !(key === "page" && Number(value) === 1)) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
