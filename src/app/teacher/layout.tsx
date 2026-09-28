import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/access";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("TEACHER");
  return <AppShell user={user}>{children}</AppShell>;
}
