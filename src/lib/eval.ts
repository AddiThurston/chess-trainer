import { Chess } from "chess.js";

export type GradeName =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type ScoredLine = {
  uci: string;
  san: string;
  cp: number | null;
  mate: number | null;
};

const PIECE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function whiteCentipawns(turn: "w" | "b", line: { cp: number | null; mate: number | null }): number {
  if (line.mate != null) {
    const ply = Math.min(Math.abs(line.mate), 60);
    const side = line.mate > 0 ? 100000 - ply * 50 : -(100000 - ply * 50);
    return turn === "w" ? side : -side;
  }
  const cp = line.cp ?? 0;
  return turn === "w" ? cp : -cp;
}

export function formatEval(whiteCp: number): string {
  if (Math.abs(whiteCp) >= 90000) {
    const mate = Math.max(1, Math.round((100000 - Math.abs(whiteCp)) / 50));
    return whiteCp > 0 ? `+M${mate}` : `-M${mate}`;
  }
  const pawns = whiteCp / 100;
  const digits = Math.abs(pawns).toFixed(1);
  if (pawns > 0) return `+${digits}`;
  if (pawns < 0) return `-${digits}`;
  return "0.0";
}

/** Share of the bar that belongs to White, from 0 to 1. */
export function whiteShare(whiteCp: number): number {
  if (whiteCp >= 90000) return 1;
  if (whiteCp <= -90000) return 0;
  return 1 / (1 + Math.exp(-0.00368208 * whiteCp));
}

export function moverLoss(turn: "w" | "b", beforeWhite: number, afterWhite: number): number {
  return turn === "w" ? beforeWhite - afterWhite : afterWhite - beforeWhite;
}

export function isSacrifice(fen: string, uci: string): boolean {
  if (uci.length < 4) return false;
  const chess = new Chess(fen);
  const from = uci.slice(0, 2);
  const moving = chess.get(from as "a1");
  if (!moving) return false;
  try {
    const played = chess.move({
      from: from as "a1",
      to: uci.slice(2, 4) as "a1",
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    if (!played?.captured) return false;
    return PIECE[played.captured] < PIECE[moving.type];
  } catch {
    return false;
  }
}

export function gradeMove(input: {
  book: boolean;
  playedUci: string;
  bestUci: string;
  lossCp: number;
  sacrifice: boolean;
  secondGap: number;
}): GradeName {
  const best = input.playedUci === input.bestUci || input.lossCp <= 8;
  if (input.book && input.lossCp < 80) return "book";
  if (best && input.sacrifice && input.secondGap >= 120) return "brilliant";
  if (best && input.secondGap >= 200) return "great";
  if (best) return "best";
  if (input.lossCp <= 25) return "excellent";
  if (input.lossCp <= 50) return "good";
  if (input.lossCp < 100) return "inaccuracy";
  if (input.lossCp < 250) return "mistake";
  return "blunder";
}

export const gradeLabel: Record<GradeName, string> = {
  brilliant: "Brilliant",
  great: "Great",
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  book: "Book",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};
