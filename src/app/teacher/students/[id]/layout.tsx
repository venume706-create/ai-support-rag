import { requirePageUser, requireStudentPage } from "@/lib/access";

/** Учитель видит только учеников своих групп: иначе HTTP 403 (проверка до границы загрузки). */
export default async function TeacherStudentLayout({ children, params }: LayoutProps<"/teacher/students/[id]">) {
  const user = await requirePageUser("TEACHER");
  const { id } = await params;
  await requireStudentPage(user, id);
  return children;
}
