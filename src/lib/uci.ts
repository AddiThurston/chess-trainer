import { Chess, type Square } from "chess.js";

export function uciToSan(fen: string, uci: string): string | null {
  if (!uci || uci === "(none)" || uci.length < 4) return null;
  const chess = new Chess(fen);
  try {
    const move = chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}
