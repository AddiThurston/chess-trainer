import { Chess } from "chess.js";
import { analyzePosition } from "@/lib/engine-client";
import { gradeLabel, gradeMove, isSacrifice, moverLoss, whiteCentipawns, type GradeName } from "@/lib/eval";

function gap(first: { cp: number | null; mate: number | null }, second?: { cp: number | null; mate: number | null }) {
  if (!second) return 0;
  if (first.mate != null && first.mate > 0 && (second.mate == null || second.mate <= 0)) return 400;
  if (first.cp == null || second.cp == null) return 0;
  return first.cp - second.cp;
}

export async function ratePlayedMove(fenBefore: string, uci: string, book: boolean): Promise<GradeName> {
  const before = new Chess(fenBefore);
  const turn = before.turn();
  const lines = await analyzePosition(fenBefore);
  const best = lines[0];
  if (!best) return book ? "book" : "good";
  let played = false;
  try {
    played = Boolean(
      before.move({
        from: uci.slice(0, 2) as "a1",
        to: uci.slice(2, 4) as "a1",
        promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
      }),
    );
  } catch {
    played = false;
  }
  if (!played) return "blunder";
  const afterLines = await analyzePosition(before.fen());
  const after = afterLines[0];
  const beforeWhite = whiteCentipawns(turn, best);
  const afterWhite = after ? whiteCentipawns(before.turn(), after) : beforeWhite;
  const loss = Math.max(0, moverLoss(turn, beforeWhite, afterWhite));
  return gradeMove({
    book,
    playedUci: uci,
    bestUci: best.uci,
    lossCp: uci === best.uci ? 0 : loss,
    sacrifice: isSacrifice(fenBefore, uci),
    secondGap: gap(best, lines[1]),
  });
}

export function gradeText(grade: GradeName) {
  return gradeLabel[grade];
}
