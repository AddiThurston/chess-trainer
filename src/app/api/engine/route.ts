import { NextResponse } from "next/server";
import { stockfishMove, stockfishStatus } from "@/lib/stockfish-server";

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

  let body: { fen?: string; level?: string };
  try {
    body = (await request.json()) as { fen?: string; level?: string };
  } catch {
    return NextResponse.json({ ok: false, code: "error", message: "Bad request." }, { status: 400 });
  }

  if (!body.fen || !body.level) {
    return NextResponse.json({ ok: false, code: "error", message: "Missing fen or level." }, { status: 400 });
  }

  try {
    const move = await stockfishMove(body.fen, body.level);
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
