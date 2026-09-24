"use client";

import { formatEval, whiteShare } from "@/lib/eval";

export function EvalBar({
  whiteCp,
  orientation = "white",
}: {
  whiteCp: number | null;
  orientation?: "white" | "black";
}) {
  const share = whiteCp == null ? 0.5 : whiteShare(whiteCp);
  const whiteOnBottom = orientation === "white";
  const topShare = whiteOnBottom ? 1 - share : share;
  const label = whiteCp == null ? "…" : formatEval(whiteCp);

  return (
    <div className="relative w-7 shrink-0 self-stretch overflow-hidden rounded-md ring-1 ring-black/40 sm:w-8">
      <div className="absolute inset-x-0 top-0 bg-[#1c1c1c]" style={{ height: `${topShare * 100}%` }} />
      <div className="absolute inset-x-0 bottom-0 bg-[#f4f4f4]" style={{ height: `${(1 - topShare) * 100}%` }} />
      <span className="sr-only">
        Evaluation {label}. {whiteCp != null && whiteCp >= 0 ? "White" : "Black"} is ahead.
      </span>
      <span className="pointer-events-none absolute top-1 left-0 w-full text-center text-[10px] font-semibold text-white mix-blend-difference">
        {label}
      </span>
    </div>
  );
}
