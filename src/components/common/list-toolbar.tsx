import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ru } from "@/lib/i18n/ru";

interface Option {
  value: string;
  label: string;
}

export interface ToolbarFilter {
  name: string;
  value: string;
  allLabel: string;
  options: Option[];
}

/** Поиск и фильтры списка. Обычная GET-форма: работает и без JavaScript. */
export function ListToolbar({
  pathname,
  q,
  filters = [],
  hidden = {},
  searchPlaceholder = ru.common.searchPlaceholder,
  showSearch = true,
}: {
  pathname: string;
  q?: string;
  filters?: ToolbarFilter[];
  hidden?: Record<string, string>;
  searchPlaceholder?: string;
  showSearch?: boolean;
}) {
  const active = Boolean(q) || filters.some((f) => f.value);
  return (
    <form action={pathname} method="get" className="paper mb-4 grid gap-2 rounded-md p-3 sm:flex sm:flex-wrap sm:items-center" role="search">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {showSearch && (
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={searchPlaceholder} className="pl-9" aria-label={ru.common.search} />
        </div>
      )}
      {filters.map((f) => (
        <NativeSelect key={f.name} name={f.name} defaultValue={f.value} className="sm:w-52" aria-label={f.allLabel}>
          <option value="">{f.allLabel}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      ))}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
          {ru.common.apply}
        </Button>
        {active && (
          <Button asChild variant="ghost" className="flex-1 sm:flex-none">
            <Link href={pathname}>{ru.common.reset}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
