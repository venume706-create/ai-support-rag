import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ru } from "@/lib/i18n/ru";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        size={compact ? "icon" : "default"}
        className={compact ? "" : "w-full justify-start gap-3 px-3 text-muted-foreground"}
        aria-label={ru.nav.logout}
        data-testid="logout"
      >
        <LogOut className="size-4" />
        {!compact && ru.nav.logout}
      </Button>
    </form>
  );
}
