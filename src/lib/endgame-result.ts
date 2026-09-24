import { Chess } from "chess.js";
import type { Endgame } from "@/data/endgames";

function count(chess: Chess, color: "w" | "b", type: "q" | "r" | "p") {
  let total = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece && piece.color === color && piece.type === type) total += 1;
    }
  }
  return total;
}

export function assessEndgame(
  chess: Chess,
  drill: Endgame,
  userMoves: number,
): { state: "playing" | "success" | "failure"; message: string } {
  const user = drill.user;
  const opponent = user === "w" ? "b" : "w";

  if (chess.isCheckmate()) {
    return chess.turn() === user
      ? { state: "failure", message: "Checkmate against you." }
      : { state: "success", message: "Checkmate." };
  }
  if (chess.isStalemate()) {
    return drill.goalType === "draw"
      ? { state: "success", message: "Stalemate. The draw holds." }
      : {
          state: "failure",
          message: "Stalemate. The king has no legal move, but he is not in check.",
        };
  }
  if (chess.isDraw()) {
    return drill.goalType === "draw"
      ? { state: "success", message: "Drawn. That is the goal." }
      : { state: "failure", message: "The position is drawn." };
  }

  const userQueen = count(chess, user, "q");
  const userRook = count(chess, user, "r");
  const userPawn = count(chess, user, "p");
  const opponentQueen = count(chess, opponent, "q");
  const opponentRook = count(chess, opponent, "r");
  const opponentPawn = count(chess, opponent, "p");

  if (drill.goalType === "mate") {
    const pieceLeft = drill.id === "queen-mate" ? userQueen : userRook;
    if (pieceLeft === 0) {
      return { state: "failure", message: "The mating piece is gone." };
    }
    if (userMoves >= 35) {
      return {
        state: "failure",
        message: "Too many moves. Cut the king off and bring your own king closer.",
      };
    }
  }

  if (drill.goalType === "promote") {
    if (userQueen > 0) return { state: "success", message: "The pawn promotes." };
    if (drill.id === "outside-passer" && opponentPawn === 0 && userPawn > 0) {
      return { state: "success", message: "The kingside pawns are gone, and your passer remains." };
    }
    if (userPawn === 0) return { state: "failure", message: "The pawn is gone." };
    if (userMoves >= 40) {
      return { state: "failure", message: "The pawn did not get through. Use the king." };
    }
  }

  if (drill.goalType === "lucena") {
    if (userQueen > 0) return { state: "success", message: "The pawn promotes." };
    if (opponentRook === 0 && userRook > 0) {
      return { state: "success", message: "The defending rook is gone." };
    }
    if (userRook === 0 || userPawn === 0) {
      return { state: "failure", message: "The Lucena material is gone." };
    }
    if (userMoves >= 30) {
      return { state: "failure", message: "Build the bridge sooner. The rook shelters the king from checks." };
    }
  }

  if (drill.goalType === "draw") {
    if (opponentPawn === 0) return { state: "success", message: "The pawn is gone. The draw is safe." };
    if (userRook === 0 || opponentQueen > 0) {
      return { state: "failure", message: "The Philidor setup collapsed." };
    }
    if (userMoves >= 12) return { state: "success", message: "Twelve moves held. The draw stands." };
  }

  if (drill.goalType === "activity") {
    if (opponentPawn === 0 || userQueen > 0) return { state: "success", message: "The pawn is won." };
    if (userPawn === 0) return { state: "failure", message: "Your pawn fell first." };
    if (userMoves >= 30) return { state: "failure", message: "The king did not break in." };
  }

  if (drill.goalType === "race") {
    if (userQueen > 0 && opponentQueen === 0) return { state: "success", message: "You promoted first." };
    if (opponentQueen > 0) return { state: "failure", message: "Black promoted." };
    if (userPawn === 0) return { state: "failure", message: "Your pawn never arrived." };
  }

  return { state: "playing", message: "" };
}
