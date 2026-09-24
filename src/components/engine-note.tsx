import { STOCKFISH_HINT } from "@/lib/levels";
import type { EngineSource } from "@/lib/engine-client";

export function EngineNote({
  binary,
  source,
  error,
}: {
  binary: boolean | null;
  source: EngineSource | null;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-xl bg-destructive/15 px-3 py-3 text-sm text-foreground ring-1 ring-destructive/30">
        <p>{error}</p>
        <p className="mt-2 text-muted-foreground">{STOCKFISH_HINT}</p>
      </div>
    );
  }

  if (binary === null && !source) {
    return <p className="text-sm text-muted-foreground">Checking for Stockfish…</p>;
  }

  if (source === "policy") {
    return (
      <p className="text-sm text-muted-foreground">
        Reply from the built-in endgame guide. {STOCKFISH_HINT}
      </p>
    );
  }

  if (binary === false || source === "wasm") {
    return (
      <p className="text-sm text-muted-foreground">
        No Stockfish binary on this machine, so the bundled browser engine is playing. {STOCKFISH_HINT}
      </p>
    );
  }

  return <p className="text-sm text-muted-foreground">Stockfish is running on this machine.</p>;
}
