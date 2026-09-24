import { NextResponse } from "next/server";
import { stockfishAnalyze, stockfishMove, stockfishStatus } from "@/lib/stockfish-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(stockfishStatus());
}

export async function POST(request: Request) {
  const status = stockfishStatus();
  if (!status.binary) {
    return NextResponse.json(
      { ok: false, code: "missing", hint: status.hint, message: "Stockfish is not installed on this machine." },
      { status: 503 },
    );
  }

  let body: { fen?: string; level?: string; analyze?: boolean };
  try {
    body = (await request.json()) as { fen?: string; level?: string; analyze?: boolean };
  } catch {
    return NextResponse.json({ ok: false, code: "error", message: "Bad request." }, { status: 400 });
  }

  if (!body.fen || (!body.level && !body.analyze)) {
    return NextResponse.json({ ok: false, code: "error", message: "Missing fen or level." }, { status: 400 });
  }

  try {
    if (body.analyze) {
      const analysis = await stockfishAnalyze(body.fen);
      return NextResponse.json({ ok: true, ...analysis, source: "binary" });
    }
    const move = await stockfishMove(body.fen, body.level ?? "exact");
    return NextResponse.json({ ok: true, ...move, source: "binary" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stockfish failed.";
    if (message === "missing") {
      return NextResponse.json(
        { ok: false, code: "missing", hint: status.hint, message: "Stockfish is not installed on this machine." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, code: "error", hint: status.hint, message }, { status: 500 });
  }
}
