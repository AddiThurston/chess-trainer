import { NextResponse } from "next/server";
import { ADMIN_ONLY, adminUser, fail, readJson, text } from "@/lib/api";
import { startImport } from "@/lib/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await adminUser();
  if (!user) return fail(ADMIN_ONLY, 403);
  const body = await readJson(request);
  const allowlist = text(body?.allowlist)
    .toUpperCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const result = await startImport(text(body?.inputs), allowlist, user.id);
  if (!result.id) return fail("Nothing in that list is a Lichess study link, study ID, or username.");
  return NextResponse.json({ ok: true, id: result.id, unknown: result.unknown });
}
