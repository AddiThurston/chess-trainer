import { Chess, type Move } from "chess.js";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const MATE = 100;

type PuzzleLike = {
  fen: string;
  side: string;
  theme: string;
  solution: string[];
};

function sideOf(puzzle: PuzzleLike): "w" | "b" {
  return puzzle.side === "b" ? "b" : "w";
}

function advantage(chess: Chess, side: "w" | "b") {
  let score = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = VALUE[piece.type] ?? 0;
      score += piece.color === side ? value : -value;
    }
  }
  return score;
}

function playSan(chess: Chess, san: string): Move | null {
  try {
    return chess.move(san);
  } catch {
    return null;
  }
}

export function puzzleTarget(puzzle: PuzzleLike): number {
  const side = sideOf(puzzle);
  const chess = new Chess(puzzle.fen);
  for (const san of puzzle.solution) {
    if (!playSan(chess, san)) break;
    if (chess.isCheckmate()) return MATE;
  }
  return chess.isCheckmate() ? MATE : advantage(chess, side);
}

function attackerMovesIn(solution: string[]) {
  return Math.ceil(solution.length / 2);
}

function forcesMate(chess: Chess, attackerMoves: number): boolean {
  if (attackerMoves <= 0 || chess.isGameOver()) return chess.isCheckmate();
  for (const move of chess.moves({ verbose: true })) {
    chess.move(move);
    if (chess.isCheckmate()) {
      chess.undo();
      return true;
    }
    let holds = false;
    if (!chess.isGameOver()) {
      const replies = chess.moves({ verbose: true });
      holds =
        replies.length > 0 &&
        replies.every((reply) => {
          chess.move(reply);
          const still = !chess.isGameOver() && forcesMate(chess, attackerMoves - 1);
          chess.undo();
          return still;
        });
    }
    chess.undo();
    if (holds) return true;
  }
  return false;
}

function forcedScore(chess: Chess, side: "w" | "b", plies: number): number {
  if (chess.isCheckmate()) return chess.turn() === side ? -MATE : MATE;
  if (chess.isDraw()) return 0;
  if (plies <= 0) return advantage(chess, side);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return advantage(chess, side);
  const maximizing = chess.turn() === side;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = forcedScore(chess, side, plies - 1);
    chess.undo();
    if (maximizing) best = Math.max(best, score);
    else best = Math.min(best, score);
  }
  return best;
}

export function moveKeepsWin(puzzle: PuzzleLike, fen: string, from: string, to: string, promotion?: string): boolean {
  const side = sideOf(puzzle);
  const target = puzzleTarget(puzzle);
  const matePuzzle = puzzle.theme.startsWith("mate") || target >= MATE;
  const chess = new Chess(fen);
  let played: Move | null = null;
  try {
    played = chess.move({
      from: from as "a1",
      to: to as "a1",
      promotion: promotion as "q" | "r" | "b" | "n" | undefined,
    });
  } catch {
    played = null;
  }
  if (!played) return false;
  if (matePuzzle) {
    if (chess.isCheckmate()) return true;
    const left = attackerMovesIn(puzzle.solution) - 1;
    if (left <= 0 || chess.isGameOver()) return false;
    const replies = chess.moves({ verbose: true });
    return (
      replies.length > 0 &&
      replies.every((reply) => {
        chess.move(reply);
        const still = !chess.isGameOver() && forcesMate(chess, left);
        chess.undo();
        return still;
      })
    );
  }
  const depth = Math.max(1, puzzle.solution.length - 1);
  return forcedScore(chess, side, depth) >= target;
}

export function defenseReply(puzzle: PuzzleLike, fen: string): { from: string; to: string; san: string } | null {
  const side = sideOf(puzzle);
  const chess = new Chess(fen);
  if (chess.turn() === side || chess.isGameOver()) return null;
  const target = puzzleTarget(puzzle);
  const matePuzzle = puzzle.theme.startsWith("mate") || target >= MATE;
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  let choice = moves[0];
  let worst = Infinity;
  for (const move of moves) {
    chess.move(move);
    let score = 0;
    if (matePuzzle) {
      score = chess.isCheckmate() ? -MATE : forcesMate(chess, Math.max(1, attackerMovesIn(puzzle.solution) - 1)) ? MATE : advantage(chess, side);
    } else {
      score = forcedScore(chess, side, Math.max(1, puzzle.solution.length - 2));
    }
    chess.undo();
    if (score < worst) {
      worst = score;
      choice = move;
    }
  }
  return { from: choice.from, to: choice.to, san: choice.san };
}

export function winAchieved(puzzle: PuzzleLike, fen: string): boolean {
  const side = sideOf(puzzle);
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return chess.turn() !== side;
  if (puzzle.theme.startsWith("mate")) return false;
  const target = puzzleTarget(puzzle);
  if (advantage(chess, side) < target) return false;
  if (chess.turn() === side) return false;
  const replies = chess.moves({ verbose: true });
  if (!replies.length) return true;
  return replies.every((move) => {
    chess.move(move);
    const still = advantage(chess, side) >= target || chess.isCheckmate();
    chess.undo();
    return still;
  });
}
