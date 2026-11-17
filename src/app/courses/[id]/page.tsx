import { notFound } from "next/navigation";
import { CourseExplorer } from "@/components/course-explorer";
import { currentUser } from "@/lib/auth";
import { canEdit, getChapters, getCourse, getMoves, needsPermission } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: PageProps<"/courses/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  const course = Number.isInteger(Number(id)) ? await getCourse(Number(id), user) : null;
  if (!course) notFound();
  const [chapters, moves] = await Promise.all([getChapters(course.id), getMoves(course.id)]);
  return (
    <CourseExplorer
      course={course}
      chapters={chapters}
      moves={moves}
      canEdit={canEdit(course, user)}
      isAdmin={user?.isAdmin ?? false}
      needsPermission={needsPermission(course.kind)}
    />
  );
}
