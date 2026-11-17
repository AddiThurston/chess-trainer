import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { positionKey, START_FEN, type TreeMove } from "@/lib/move-tree";

type Opening = { eco: string; name: string };

let book: Map<string, Opening> | undefined;

// The dataset is lichess-org/chess-openings (CC0): one named line per row, keyed here by the position it reaches.
function loadBook() {
  const positions = new Map<string, Opening>();
  for (const file of ["a", "b", "c", "d", "e"]) {
    const rows = readFileSync(join(process.cwd(), "data", "openings", `${file}.tsv`), "utf8").trim().split("\n").slice(1);
    for (const row of rows) {
      const [eco, name, pgn] = row.split("\t");
      const chess = new Chess();
      for (const san of pgn.split(" ").filter((token) => !token.endsWith("."))) chess.move(san);
      positions.set(positionKey(chess.fen()), { eco, name });
    }
  }
  return positions;
}

/** The deepest named opening on the chapter's main line, or blanks for a chapter that does not start from move one. */
export function classifyOpening(moves: TreeMove[], startFen: string): Opening {
  book ??= loadBook();
  const main = new Map(moves.filter((move) => move.ord === 0).map((move) => [move.from, move.to]));
  let found: Opening = { eco: "", name: "" };
  if (startFen !== START_FEN) return found;
  let key: string | undefined = positionKey(startFen);
  for (let ply = 0; key && ply < 40; ply += 1) {
    found = book.get(key) ?? found;
    key = main.get(key);
  }
  return found;
}

export function openingFamily(name: string) {
  return name.split(":")[0].split(",")[0];
}
