import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/access";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <AppShell user={user}>{children}</AppShell>;
}
