import { Chess, type Move } from "chess.js";

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -100000 : 100000;
  if (chess.isDraw()) return 0;

  const board = chess.board();
  let score = 0;
  let whiteKing: { r: number; f: number } | null = null;
  let blackKing: { r: number; f: number } | null = null;
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank][file];
      if (!piece) continue;
      let extra = 0;
      if (piece.type === "p") {
        extra = (piece.color === "w" ? 7 - rank : rank) * 14;
      }
      if (piece.type === "k") {
        const center = Math.abs(file - 3.5) + Math.abs(rank - 3.5);
        extra = -center * 6;
        if (piece.color === "w") whiteKing = { r: rank, f: file };
        else blackKing = { r: rank, f: file };
      }
      const total = VALUE[piece.type] + extra;
      if (piece.color === "w") {
        score += total;
        whiteMaterial += VALUE[piece.type];
      } else {
        score -= total;
        blackMaterial += VALUE[piece.type];
      }
    }
  }

  if (whiteKing && blackKing) {
    const dist = Math.abs(whiteKing.f - blackKing.f) + Math.abs(whiteKing.r - blackKing.r);
    const edge = (king: { r: number; f: number }) =>
      Math.min(king.f, 7 - king.f, king.r, 7 - king.r);
    if (blackMaterial === 0 && whiteMaterial >= 500) {
      score += (16 - dist) * 12;
      score += (3 - edge(blackKing)) * 30;
    }
    if (whiteMaterial === 0 && blackMaterial >= 500) {
      score -= (16 - dist) * 12;
      score -= (3 - edge(whiteKing)) * 30;
    }
  }

  return score;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, nodes: { n: number }): number {
  nodes.n += 1;
  if (nodes.n > 20000 || depth === 0 || chess.isGameOver()) {
    const score = evaluate(chess);
    return chess.turn() === "w" ? score : -score;
  }

  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => Number(Boolean(b.captured)) - Number(Boolean(a.captured)));
  let best = -Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, nodes);
    chess.undo();
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

export function policyMove(fen: string): string | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;

  let best: Move = moves[0];
  let bestScore = -Infinity;
  const nodes = { n: 0 };
  for (const move of moves) {
    chess.move(move);
    if (chess.isCheckmate()) {
      chess.undo();
      return move.san;
    }
    const score = -negamax(chess, 2, -Infinity, Infinity, nodes);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best.san;
}
