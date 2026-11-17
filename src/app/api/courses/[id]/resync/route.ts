import { NextResponse } from "next/server";
import { ADMIN_ONLY, adminUser, fail } from "@/lib/api";
import { resyncCourse } from "@/lib/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: RouteContext<"/api/courses/[id]/resync">) {
  const user = await adminUser();
  if (!user) return fail(ADMIN_ONLY, 403);
  const { id } = await ctx.params;
  const jobId = Number.isInteger(Number(id)) ? await resyncCourse(Number(id), user.id) : null;
  if (!jobId) return fail("This course was not built from Lichess studies.", 404);
  return NextResponse.json({ ok: true, id: jobId });
}
