"use client";

import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from "react-chessboard";
import { Button } from "@/components/ui/button";

const LIGHT = "#eeeed2";
const DARK = "#769656";
const LIGHT_LAST = "#f6f682";
const DARK_LAST = "#baca44";

type MoveAttempt = {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
};

export function TrainerBoard({
  fen,
  orientation = "white",
  interactive = true,
  playerColor = "w",
  lastMove = null,
  hintMove = null,
  boardId = "trainer",
  onMove,
}: {
  fen: string;
  orientation?: "white" | "black";
  interactive?: boolean;
  playerColor?: "w" | "b";
  lastMove?: { from: string; to: string } | null;
  hintMove?: { from: string; to: string } | null;
  boardId?: string;
  onMove: (move: MoveAttempt) => boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);

  const legalTargets = useMemo(() => {
    if (!selected) return new Map<string, { promotion?: string }>();
    const chess = new Chess(fen);
    const moves = chess.moves({ square: selected as Square, verbose: true });
    return new Map(moves.map((move) => [move.to, { promotion: move.promotion }]));
  }, [fen, selected]);

  function squareShade(square: string) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    return (file + rank) % 2 === 1 ? "dark" : "light";
  }

  function baseColor(square: string) {
    const dark = squareShade(square) === "dark";
    if (lastMove && (lastMove.from === square || lastMove.to === square)) {
      return dark ? DARK_LAST : LIGHT_LAST;
    }
    return dark ? DARK : LIGHT;
  }

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selected) {
      styles[selected] = {
        backgroundColor: baseColor(selected),
        boxShadow: "inset 0 0 0 4px rgba(224, 177, 90, 0.95)",
      };
      for (const target of legalTargets.keys()) {
        const capture = new Chess(fen).get(target as Square);
        styles[target] = capture
          ? {
              backgroundColor: baseColor(target),
              boxShadow: "inset 0 0 0 5px rgba(20, 17, 14, 0.45)",
            }
          : {
              backgroundColor: baseColor(target),
              backgroundImage: "radial-gradient(circle, rgba(20,17,14,0.38) 18%, transparent 20%)",
            };
      }
    }
    if (hintMove) {
      for (const square of [hintMove.from, hintMove.to]) {
        styles[square] = {
          ...(styles[square] ?? { backgroundColor: baseColor(square) }),
          boxShadow: "inset 0 0 0 4px rgba(224, 177, 90, 0.95)",
        };
      }
    }
    if (lastMove) {
      for (const square of [lastMove.from, lastMove.to]) {
        if (!styles[square]) styles[square] = { backgroundColor: baseColor(square) };
      }
    }
    return styles;
    // baseColor is derived from lastMove, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, legalTargets, fen, hintMove, lastMove]);

  function belongsToPlayer(pieceType: string | undefined) {
    return pieceType?.toLowerCase().startsWith(playerColor) ?? false;
  }

  function tryMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    const chess = new Chess(fen);
    const options = chess.moves({ square: from as Square, verbose: true }).filter((move) => move.to === to);
    if (!options.length) return false;
    if (options.some((move) => move.promotion) && !promotion) {
      setPending({ from, to });
      setSelected(null);
      return false;
    }
    const ok = onMove({ from, to, promotion });
    if (ok) {
      setSelected(null);
      setPending(null);
    }
    return ok;
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!interactive || !targetSquare) return false;
    return tryMove(sourceSquare, targetSquare);
  }

  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    if (!interactive || pending) return;
    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      if (piece && belongsToPlayer(piece.pieceType)) {
        setSelected(square);
        return;
      }
      tryMove(selected, square);
      return;
    }
    if (piece && belongsToPlayer(piece.pieceType)) setSelected(square);
  }

  return (
    <div className="w-full">
      <div className="aspect-square w-full overflow-hidden rounded-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] ring-1 ring-black/40">
        <Chessboard
          options={{
            id: boardId,
            position: fen,
            boardOrientation: orientation,
            allowDragging: interactive && !pending,
            showNotation: true,
            animationDurationInMs: 180,
            darkSquareStyle: { backgroundColor: DARK },
            lightSquareStyle: { backgroundColor: LIGHT },
            darkSquareNotationStyle: { color: "#eeeed2" },
            lightSquareNotationStyle: { color: "#5d7a45" },
            squareStyles,
            allowDrawingArrows: false,
            arrows: hintMove
              ? [{ startSquare: hintMove.from, endSquare: hintMove.to, color: "rgba(224,177,90,0.95)" }]
              : [],
            canDragPiece: ({ piece }) => interactive && belongsToPlayer(piece.pieceType),
            onPieceDrop,
            onSquareClick,
          }}
        />
      </div>
      {pending ? (
        <div className="mt-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="mb-2 text-sm text-muted-foreground">Promote the pawn.</p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["q", "Queen"],
                ["r", "Rook"],
                ["b", "Bishop"],
                ["n", "Knight"],
              ] as const
            ).map(([piece, label]) => (
              <Button
                key={piece}
                className="min-h-11"
                onClick={() => tryMove(pending.from, pending.to, piece)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
