import { Loader2 } from "lucide-react";
import { ru } from "@/lib/i18n/ru";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4" aria-busy="true">
      <div className="leather stitched flex w-full max-w-md flex-col items-center gap-3 rounded-lg px-6 py-16">
        <Loader2 className="relative z-10 size-8 animate-spin text-brass-light" />
        <p className="relative z-10 text-sm text-on-wood-muted">{ru.common.loading}</p>
      </div>
    </div>
  );
}
