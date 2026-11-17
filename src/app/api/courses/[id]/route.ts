import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { canEdit, deleteCourse, getChapters, getCourse, getMoves, updateCourse, type CourseChanges } from "@/lib/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function load(ctx: RouteContext<"/api/courses/[id]">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  const course = Number.isInteger(Number(id)) ? await getCourse(Number(id), user) : null;
  return { user, course };
}

export async function GET(_request: Request, ctx: RouteContext<"/api/courses/[id]">) {
  const { course } = await load(ctx);
  if (!course) return fail("That course does not exist.", 404);
  const [chapters, moves] = await Promise.all([getChapters(course.id), getMoves(course.id)]);
  return NextResponse.json({ ok: true, course, chapters, moves });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/courses/[id]">) {
  const { user, course } = await load(ctx);
  if (!course) return fail("That course does not exist.", 404);
  if (!canEdit(course, user)) return fail("You cannot change this course.", 403);
  const body = await readJson(request);
  if (!body) return fail("Bad request.");
  const changes: CourseChanges = {};
  if (typeof body.title === "string") changes.title = body.title;
  if (typeof body.description === "string") changes.description = body.description;
  if (body.color === "w" || body.color === "b") changes.color = body.color;
  if (body.visibility === "private" || body.visibility === "public") changes.visibility = body.visibility;
  if (typeof body.permissionNote === "string") changes.permissionNote = body.permissionNote;
  // Only the admin records an author's permission, so an owner cannot wave their own import through.
  if (typeof body.permissionGranted === "boolean") {
    if (!user?.isAdmin) return fail("Only the admin can record an author's permission.", 403);
    changes.permissionGranted = body.permissionGranted;
    if (!body.permissionGranted) changes.visibility = "private";
  }
  const problem = await updateCourse(course, changes);
  if (problem) return fail(problem);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/courses/[id]">) {
  const { user, course } = await load(ctx);
  if (!course) return fail("That course does not exist.", 404);
  if (!canEdit(course, user)) return fail("You cannot delete this course.", 403);
  await deleteCourse(course.id);
  return NextResponse.json({ ok: true });
}
