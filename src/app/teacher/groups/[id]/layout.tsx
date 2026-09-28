import { requireGroupPage, requirePageUser } from "@/lib/access";

/**
 * Проверка доступа к группе выполняется в layout — до границы загрузки страницы,
 * поэтому чужая группа отдаёт настоящий HTTP 403, а несуществующая — 404.
 */
export default async function TeacherGroupLayout({ children, params }: LayoutProps<"/teacher/groups/[id]">) {
  const user = await requirePageUser("TEACHER");
  const { id } = await params;
  await requireGroupPage(user, id);
  return children;
}
