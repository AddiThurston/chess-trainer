"use client";

import { Chessboard } from "react-chessboard";

const LIGHT = "#eeeed2";
const DARK = "#769656";

export function StaticBoard({
  fen,
  orientation = "white",
}: {
  fen: string;
  orientation?: "white" | "black";
}) {
  return (
    <div className="aspect-square w-full overflow-hidden rounded-lg ring-1 ring-black/40">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: false,
          showNotation: false,
          animationDurationInMs: 0,
          darkSquareStyle: { backgroundColor: DARK },
          lightSquareStyle: { backgroundColor: LIGHT },
          allowDrawingArrows: false,
        }}
      />
    </div>
  );
}
