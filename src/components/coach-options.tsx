"use client";

import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { analyzePosition } from "@/lib/engine-client";
import { gradeLabel, whiteCentipawns, type GradeName } from "@/lib/eval";

export function usePositionEval(fen: string, enabled: boolean) {
  const [whiteCp, setWhiteCp] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancel = false;
    const turn = new Chess(fen).turn();
    analyzePosition(fen)
      .then((lines) => {
        if (cancel) return;
        const line = lines[0];
        setWhiteCp(line ? whiteCentipawns(turn, line) : 0);
      })
      .catch(() => {
        if (!cancel) setWhiteCp(null);
      });
    return () => {
      cancel = true;
    };
  }, [fen, enabled]);

  return enabled ? whiteCp : null;
}

const EVAL_KEY = "chess-trainer-eval";
const RATE_KEY = "chess-trainer-rate";

export function useCoachOptions() {
  const [showEval, setShowEval] = useState(false);
  const [rateMoves, setRateMoves] = useState(false);

  useEffect(() => {
    setShowEval(window.localStorage.getItem(EVAL_KEY) === "1");
    setRateMoves(window.localStorage.getItem(RATE_KEY) === "1");
  }, []);

  function toggleEval(value: boolean) {
    setShowEval(value);
    window.localStorage.setItem(EVAL_KEY, value ? "1" : "0");
  }

  function toggleRate(value: boolean) {
    setRateMoves(value);
    window.localStorage.setItem(RATE_KEY, value ? "1" : "0");
  }

  return { showEval, rateMoves, toggleEval, toggleRate };
}

export function CoachToggles({
  showEval,
  rateMoves,
  onEval,
  onRate,
}: {
  showEval: boolean;
  rateMoves: boolean;
  onEval: (value: boolean) => void;
  onRate: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={showEval} onChange={(event) => onEval(event.target.checked)} />
        Show evaluation bar
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={rateMoves} onChange={(event) => onRate(event.target.checked)} />
        Rate moves
      </label>
    </div>
  );
}

export function GradeLine({ san, grade }: { san: string; grade: GradeName }) {
  return (
    <p className="text-sm">
      <span className="font-medium">{san}</span>
      <span className="text-muted-foreground"> · {gradeLabel[grade]}</span>
    </p>
  );
}
