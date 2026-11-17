import { NextResponse } from "next/server";
import { ADMIN_ONLY, adminUser, fail } from "@/lib/api";
import { getJob } from "@/lib/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/imports/[id]">) {
  if (!(await adminUser())) return fail(ADMIN_ONLY, 403);
  const { id } = await ctx.params;
  const job = Number.isInteger(Number(id)) ? await getJob(Number(id)) : null;
  if (!job) return fail("That import does not exist.", 404);
  return NextResponse.json({ ok: true, job });
}
