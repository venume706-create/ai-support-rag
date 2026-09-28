"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { markAllAttendance } from "@/app/actions/teacher";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";

export function MarkAllPresent({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      data-testid="mark-all-present"
      onClick={() =>
        start(async () => {
          const r = await markAllAttendance({ lessonId, status: "PRESENT" });
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
      {ru.teacher.markAllPresent}
    </Button>
  );
}
