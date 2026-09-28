import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/access";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("STUDENT");
  return <AppShell user={user}>{children}</AppShell>;
}
