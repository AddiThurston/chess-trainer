import Link from "next/link";
import { Lock } from "lucide-react";
import { StaticBoard } from "@/components/static-board";
import { TitleBadge } from "@/components/title-badge";
import type { Course } from "@/lib/courses";
import { keyToFen } from "@/lib/move-tree";

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/5 hover:bg-popover"
    >
      <div className="p-3 pb-0">
        <StaticBoard fen={keyToFen(course.thumbKey)} orientation={course.color === "b" ? "black" : "white"} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-lg leading-snug font-bold">{course.title}</h3>
        {course.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm text-muted-foreground">
          {course.authorName ? (
            <span className="flex items-center gap-1.5">
              <TitleBadge title={course.authorTitle} />
              {course.authorName}
            </span>
          ) : null}
          <span>
            {course.lineCount} {course.lineCount === 1 ? "line" : "lines"}
          </span>
          <span>{course.color === "b" ? "Black" : "White"}</span>
          {course.visibility === "private" ? (
            <span className="flex items-center gap-1">
              <Lock className="size-3.5" />
              Private
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
