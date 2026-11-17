import { NextResponse } from "next/server";
import { ADMIN_ONLY, adminUser, fail, readJson, text } from "@/lib/api";
import { coursesFromChapters } from "@/lib/study-courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await adminUser();
  if (!user) return fail(ADMIN_ONLY, 403);
  const body = await readJson(request);
  const chapterIds = Array.isArray(body?.chapterIds) ? body.chapterIds.filter(Number.isInteger) : [];
  const mode = body?.mode === "split" ? "split" : "merge";
  const result = await coursesFromChapters(chapterIds as number[], mode, text(body?.title), user.id);
  if (result.error) return fail(result.error);
  return NextResponse.json({ ok: true, ids: result.ids });
}
