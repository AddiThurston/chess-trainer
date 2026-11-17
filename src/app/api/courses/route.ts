import { NextResponse } from "next/server";
import { fail, readJson, text } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { importPgnCourse, listCourses } from "@/lib/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, courses: await listCourses(await currentUser()) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return fail("Only the admin can import a PGN.", 403);
  const body = await readJson(request);
  const title = text(body?.title);
  const pgn = text(body?.pgn);
  if (!title || !pgn) return fail("A course needs a title and a PGN.");
  const color = body?.color === "w" || body?.color === "b" ? body.color : undefined;
  const result = await importPgnCourse(
    {
      title,
      pgn,
      color,
      description: text(body?.description),
      authorName: text(body?.authorName),
      authorTitle: text(body?.authorTitle),
      authorUrl: text(body?.authorUrl),
      sourceName: text(body?.sourceName),
      sourceUrl: text(body?.sourceUrl),
    },
    user,
  );
  if (!result.id) {
    return NextResponse.json(
      { ok: false, code: "error", message: "No moves could be read from that PGN.", warnings: result.warnings },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, id: result.id, warnings: result.warnings });
}
