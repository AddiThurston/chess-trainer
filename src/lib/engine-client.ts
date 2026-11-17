import { searchConfig, STOCKFISH_HINT, type SearchConfig } from "@/lib/levels";
import { policyMove } from "@/lib/endgame-policy";
import { uciToSan } from "@/lib/uci";

export type EngineSource = "binary" | "wasm" | "policy";

export type EnginePlay = {
  san: string;
  uci: string;
  source: EngineSource;
  binaryMissing: boolean;
};

export type AnalysisLine = {
  uci: string;
  san: string;
  cp: number | null;
  mate: number | null;
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

function collectUntil(worker: Worker, timeoutMs: number) {
  return new Promise<{ best: string; infos: string[] }>((resolve, reject) => {
    const infos: string[] = [];
    const timer = window.setTimeout(() => {
      worker.removeEventListener("message", onMessage);
      reject(new Error("The browser engine timed out."));
    }, timeoutMs);
    const onMessage = (event: MessageEvent) => {
      const line = String(event.data ?? "");
      if (line.startsWith("info ")) infos.push(line);
      if (line.startsWith("bestmove")) {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        resolve({ best: line, infos });
      }
    };
    worker.addEventListener("message", onMessage);
  });
}

async function wasmSearch(fen: string, config: SearchConfig, multipv: number) {
  return enqueue(async () => {
    const worker = await loadWorker();
    worker.postMessage("ucinewgame");
    worker.postMessage("isready");
    await waitLine(worker, (line) => line.includes("readyok"), 8000);
    worker.postMessage(`setoption name MultiPV value ${multipv}`);
    worker.postMessage(`setoption name UCI_LimitStrength value ${config.limitStrength ? "true" : "false"}`);
    if (config.limitStrength) worker.postMessage(`setoption name UCI_Elo value ${config.elo}`);
    worker.postMessage(`setoption name Skill Level value ${config.skill}`);
    worker.postMessage("isready");
    await waitLine(worker, (line) => line.includes("readyok"), 8000);
    worker.postMessage(`position fen ${fen}`);
    const pending = collectUntil(worker, config.movetime + 12000);
    worker.postMessage(`go depth ${config.depth} movetime ${config.movetime}`);
    const result = await pending;
    const uci = result.best.split(/\s+/)[1] ?? "";
    const san = uciToSan(fen, uci);
    return { uci, san, infos: result.infos };
  });
}

function linesFromInfos(fen: string, infos: string[]) {
  const best = new Map<number, { uci: string; san: string; cp: number | null; mate: number | null; depth: number; multipv: number }>();
  for (const line of infos) {
    if (!line.includes(" score ") || !line.includes(" pv ")) continue;
    const parts = line.split(/\s+/);
    const depthAt = parts.indexOf("depth");
    const scoreAt = parts.indexOf("score");
    const pvAt = parts.indexOf("pv");
    const multiAt = parts.indexOf("multipv");
    if (depthAt < 0 || scoreAt < 0 || pvAt < 0) continue;
    const uci = parts[pvAt + 1] ?? "";
    const san = uciToSan(fen, uci);
    if (!san) continue;
    const parsed = {
      multipv: multiAt >= 0 ? Number(parts[multiAt + 1]) : 1,
      depth: Number(parts[depthAt + 1]),
      cp: parts[scoreAt + 1] === "cp" ? Number(parts[scoreAt + 2]) : null,
      mate: parts[scoreAt + 1] === "mate" ? Number(parts[scoreAt + 2]) : null,
      uci,
      san,
    };
    const previous = best.get(parsed.multipv);
    if (!previous || parsed.depth >= previous.depth) best.set(parsed.multipv, parsed);
  }
  return [...best.values()].sort((a, b) => a.multipv - b.multipv);
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

export async function playEngine(fen: string, levelId: string): Promise<EnginePlay> {
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

  const config = searchConfig(levelId);
  if (!config) throw new Error("Unknown level");
  const wasm = await wasmSearch(fen, config, 1);
  if (!wasm.san) throw new Error("The browser engine returned no legal move.");
  return { san: wasm.san, uci: wasm.uci, source: "wasm", binaryMissing };
}

export async function analyzePosition(fen: string): Promise<AnalysisLine[]> {
  try {
    const response = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, analyze: true }),
    });
    const data = (await response.json()) as { ok?: boolean; lines?: AnalysisLine[] };
    if (data.ok && data.lines?.length) return data.lines;
  } catch {
    // Fall through to the browser engine.
  }
  const config: SearchConfig = { skill: 20, elo: 3200, depth: 12, movetime: 700, limitStrength: false };
  const wasm = await wasmSearch(fen, config, 2);
  return linesFromInfos(fen, wasm.infos);
}

export async function endgameReply(fen: string): Promise<EnginePlay> {
  try {
    return await playEngine(fen, "exact");
  } catch {
    const san = policyMove(fen);
    if (!san) throw new Error("No legal reply in this position.");
    const binary = await probeBinary();
    return { san, uci: "", source: "policy", binaryMissing: !binary.binary };
  }
}
