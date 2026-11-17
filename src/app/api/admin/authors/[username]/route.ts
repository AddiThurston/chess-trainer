import { NextResponse } from "next/server";
import { ADMIN_ONLY, adminUser, fail, readJson, text } from "@/lib/api";
import { resyncAuthor, setAuthorPermission } from "@/lib/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/authors/[username]">) {
  if (!(await adminUser())) return fail(ADMIN_ONLY, 403);
  const { username } = await ctx.params;
  const body = await readJson(request);
  const problem = await setAuthorPermission(username, body?.permissionGranted === true, text(body?.permissionNote));
  if (problem) return fail(problem);
  return NextResponse.json({ ok: true });
}

export async function POST(_request: Request, ctx: RouteContext<"/api/admin/authors/[username]">) {
  const user = await adminUser();
  if (!user) return fail(ADMIN_ONLY, 403);
  const { username } = await ctx.params;
  const id = await resyncAuthor(username, user.id);
  if (!id) return fail("That author has not been imported.", 404);
  return NextResponse.json({ ok: true, id });
}
