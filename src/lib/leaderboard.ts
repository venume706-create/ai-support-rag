/** Места в рейтинге: «соревновательная» нумерация (1, 2, 2, 4) — при равных баллах место одно. */
export interface Scored {
  id: string;
  total: number | null;
}

export interface Placed<T extends Scored> {
  item: T;
  place: number;
}

/** Участники с баллами по убыванию; ученики без данных (null) в доску не попадают. */
export function assignPlaces<T extends Scored>(items: T[]): Placed<T>[] {
  const scored = items.filter((i): i is T & { total: number } => i.total !== null).sort((a, b) => b.total - a.total);
  const out: Placed<T>[] = [];
  scored.forEach((item, index) => {
    const place = index > 0 && scored[index - 1].total === item.total ? out[index - 1].place : index + 1;
    out.push({ item, place });
  });
  return out;
}

/** Место конкретного человека среди участников (видимых в доске плюс он сам). */
export function placeOf<T extends Scored>(items: T[], id: string): { place: number; of: number } | null {
  const placed = assignPlaces(items);
  const me = placed.find((p) => p.item.id === id);
  return me ? { place: me.place, of: placed.length } : null;
}
