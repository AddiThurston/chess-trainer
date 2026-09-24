import { levels, STOCKFISH_HINT, type Level, type LevelId } from "@/lib/levels";
import { policyMove } from "@/lib/endgame-policy";
import { uciToSan } from "@/lib/uci";

export type EngineSource = "binary" | "wasm" | "policy";

export type EnginePlay = {
  san: string;
  uci: string;
  source: EngineSource;
  binaryMissing: boolean;
};

let workerPromise: Promise<Worker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function loadWorker() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The browser engine only runs on the client."));
  }
  if (workerPromise) return workerPromise;
  workerPromise = new Promise((resolve, reject) => {
    const wasmUrl = `${window.location.origin}/engine/stockfish-19-lite-single.wasm`;
    const worker = new Worker(`/engine/stockfish-19-lite-single.js#${encodeURIComponent(wasmUrl)}`);
    const timer = window.setTimeout(() => {
      workerPromise = null;
      reject(new Error("The browser engine did not start."));
    }, 20000);
    const onMessage = (event: MessageEvent) => {
      if (String(event.data).includes("uciok")) {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        resolve(worker);
      }
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", () => {
      window.clearTimeout(timer);
      workerPromise = null;
      reject(new Error("The browser engine failed to load."));
    });
    worker.postMessage("uci");
  });
  return workerPromise;
}

function waitLine(worker: Worker, predicate: (line: string) => boolean, timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      worker.removeEventListener("message", onMessage);
      reject(new Error("The browser engine timed out."));
    }, timeoutMs);
    const onMessage = (event: MessageEvent) => {
      const line = String(event.data ?? "");
      if (predicate(line)) {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        resolve(line);
      }
    };
    worker.addEventListener("message", onMessage);
  });
}

async function wasmMove(fen: string, level: Level) {
  return enqueue(async () => {
    const worker = await loadWorker();
    worker.postMessage("ucinewgame");
    worker.postMessage("isready");
    await waitLine(worker, (line) => line.includes("readyok"), 8000);
    worker.postMessage(`setoption name UCI_LimitStrength value ${level.limitStrength ? "true" : "false"}`);
    if (level.limitStrength) worker.postMessage(`setoption name UCI_Elo value ${level.elo}`);
    worker.postMessage(`setoption name Skill Level value ${level.skill}`);
    worker.postMessage("isready");
    await waitLine(worker, (line) => line.includes("readyok"), 8000);
    worker.postMessage(`position fen ${fen}`);
    const pending = waitLine(worker, (line) => line.startsWith("bestmove"), level.movetime + 12000);
    worker.postMessage(`go depth ${level.depth} movetime ${level.movetime}`);
    const line = await pending;
    const uci = line.split(/\s+/)[1] ?? "";
    const san = uciToSan(fen, uci);
    if (!san) throw new Error("The browser engine returned no legal move.");
    return { uci, san };
  });
}

export async function probeBinary(): Promise<{ binary: boolean; hint: string }> {
  try {
    const response = await fetch("/api/engine", { cache: "no-store" });
    const data = (await response.json()) as { binary?: boolean; hint?: string };
    return { binary: Boolean(data.binary), hint: data.hint || STOCKFISH_HINT };
  } catch {
    return { binary: false, hint: STOCKFISH_HINT };
  }
}

export async function playEngine(fen: string, levelId: LevelId): Promise<EnginePlay> {
  let binaryMissing = false;
  try {
    const response = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, level: levelId }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      san?: string;
      uci?: string;
      code?: string;
    };
    if (data.ok && data.san && data.uci) {
      return { san: data.san, uci: data.uci, source: "binary", binaryMissing: false };
    }
    if (data.code === "missing") binaryMissing = true;
  } catch {
    binaryMissing = true;
  }

  const wasm = await wasmMove(fen, levels[levelId]);
  return { ...wasm, source: "wasm", binaryMissing };
}

export async function endgameReply(fen: string): Promise<EnginePlay> {
  try {
    return await playEngine(fen, "club");
  } catch {
    const san = policyMove(fen);
    if (!san) throw new Error("No legal reply in this position.");
    const binary = await probeBinary();
    return { san, uci: "", source: "policy", binaryMissing: !binary.binary };
  }
}
