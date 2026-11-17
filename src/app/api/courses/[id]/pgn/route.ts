import { fail } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { getChapters, getCourse, getMoves } from "@/lib/courses";
import { toPgn } from "@/lib/move-tree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/courses/[id]/pgn">) {
  const { id } = await ctx.params;
  const course = Number.isInteger(Number(id)) ? await getCourse(Number(id), await currentUser()) : null;
  if (!course) return fail("That course does not exist.", 404);
  const [chapters, moves] = await Promise.all([getChapters(course.id), getMoves(course.id)]);
  const author = [course.authorTitle, course.authorName].filter(Boolean).join(" ");
  const pgn = toPgn({ title: course.title, site: course.sourceUrl, annotator: author }, chapters, moves);
  const filename = course.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "course";
  return new Response(pgn, {
    headers: {
      "Content-Type": "application/x-chess-pgn; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.pgn"`,
    },
  });
}
