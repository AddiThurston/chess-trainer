import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { sep } from "node:path";
import { Chess } from "chess.js";
import { isLevelId, levels, STOCKFISH_HINT, type LevelId } from "@/lib/levels";
import { uciToSan } from "@/lib/uci";

type Waiter = {
  test: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

class UciProcess {
  private proc: ChildProcessWithoutNullStreams;
  private buffer = "";
  private waiters: Waiter[] = [];
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private path: string) {
    this.proc = spawn(path, [], { stdio: ["pipe", "pipe", "pipe"] });
    this.proc.stdout.setEncoding("utf8");
    this.proc.stdout.on("data", (chunk: string) => {
      this.buffer += chunk;
      let newline = this.buffer.indexOf("\n");
      while (newline >= 0) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, "").trim();
        this.buffer = this.buffer.slice(newline + 1);
        if (line) this.dispatch(line);
        newline = this.buffer.indexOf("\n");
      }
    });
    this.proc.on("exit", () => {
      for (const waiter of this.waiters) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error("Stockfish exited"));
      }
      this.waiters = [];
    });
  }

  private dispatch(line: string) {
    const index = this.waiters.findIndex((waiter) => waiter.test(line));
    if (index < 0) return;
    const [waiter] = this.waiters.splice(index, 1);
    clearTimeout(waiter.timer);
    waiter.resolve(line);
  }

  private waitFor(test: (line: string) => boolean, timeoutMs: number) {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter.resolve !== resolve);
        reject(new Error("Stockfish timed out"));
      }, timeoutMs);
      this.waiters.push({ test, resolve, reject, timer });
    });
  }

  private send(command: string) {
    this.proc.stdin.write(`${command}\n`);
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task, task);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async handshake() {
    this.send("uci");
    await this.waitFor((line) => line === "uciok", 8000);
    this.send("isready");
    await this.waitFor((line) => line === "readyok", 8000);
  }

  stop() {
    this.proc.kill();
  }

  async bestMove(fen: string, levelId: LevelId) {
    const level = levels[levelId];
    this.send("ucinewgame");
    this.send("isready");
    await this.waitFor((line) => line === "readyok", 5000);
    this.send(`setoption name UCI_LimitStrength value ${level.limitStrength ? "true" : "false"}`);
    if (level.limitStrength) this.send(`setoption name UCI_Elo value ${level.elo}`);
    this.send(`setoption name Skill Level value ${level.skill}`);
    this.send("isready");
    await this.waitFor((line) => line === "readyok", 5000);
    this.send(`position fen ${fen}`);
    const pending = this.waitFor((line) => line.startsWith("bestmove"), level.movetime + 8000);
    this.send(`go depth ${level.depth} movetime ${level.movetime}`);
    const line = await pending;
    const uci = line.split(/\s+/)[1] ?? "";
    const san = uciToSan(fen, uci);
    if (!san) throw new Error("Stockfish returned no legal move");
    return { uci, san };
  }
}

type Slot = {
  path: string | null;
  engine: UciProcess | null;
  ready: Promise<void> | null;
};

const globalSlot = globalThis as unknown as { __chessTrainerStockfish?: Slot };

function slot(): Slot {
  if (!globalSlot.__chessTrainerStockfish) {
    globalSlot.__chessTrainerStockfish = { path: null, engine: null, ready: null };
  }
  return globalSlot.__chessTrainerStockfish;
}

function onPath(command: string) {
  try {
    const found = execFileSync("which", [command], { encoding: "utf8" }).trim();
    return found || null;
  } catch {
    return null;
  }
}

function isNativeEngine(path: string) {
  return existsSync(path) && !path.split(sep).includes("node_modules");
}

export function resolveStockfishPath(): string | null {
  const fromEnv = process.env.STOCKFISH_PATH?.trim();
  if (fromEnv && isNativeEngine(fromEnv)) return fromEnv;
  const found = onPath("stockfish");
  if (found && isNativeEngine(found)) return found;
  for (const candidate of ["/usr/games/stockfish", "/usr/bin/stockfish"]) {
    if (isNativeEngine(candidate)) return candidate;
  }
  return null;
}

async function engine(): Promise<UciProcess> {
  const path = resolveStockfishPath();
  const current = slot();
  if (!path) {
    current.engine?.stop();
    current.engine = null;
    current.path = null;
    current.ready = null;
    throw new Error("missing");
  }
  if (!current.engine || current.path !== path) {
    current.engine?.stop();
    current.path = path;
    current.engine = new UciProcess(path);
    current.ready = current.engine.handshake();
  }
  await current.ready;
  return current.engine!;
}

export function stockfishStatus() {
  const path = resolveStockfishPath();
  return {
    binary: Boolean(path),
    path,
    hint: STOCKFISH_HINT,
  };
}

export async function stockfishMove(fen: string, level: string) {
  if (!isLevelId(level)) throw new Error("Unknown level");
  const chess = new Chess(fen);
  if (chess.isGameOver()) throw new Error("Game is over");
  const proc = await engine();
  return proc.enqueue(() => proc.bestMove(fen, level));
}
