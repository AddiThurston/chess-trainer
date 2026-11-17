import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth";
import { listCourses } from "@/lib/courses";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await currentUser();
  const courses = await listCourses(user);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl font-extrabold">Courses</h1>
        {user?.isAdmin ? (
          <Link href="/admin/import" className={cn(buttonVariants(), "h-11 px-4")}>
            Import courses
          </Link>
        ) : null}
      </div>
      {courses.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <p className="mt-6 max-w-lg text-muted-foreground">
          {user?.isAdmin
            ? "No courses yet. Import a Lichess study or a PGN to make the first one."
            : "No public courses yet. Sign in to see your own."}
        </p>
      )}
    </div>
  );
}
