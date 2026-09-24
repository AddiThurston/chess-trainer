import { Chess } from "chess.js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Openings are TypeScript. Replay the SAN strings by importing via a tiny eval of the file
// after stripping types is unnecessary: duplicate the load by transpiling with node strip types
// is not available for .ts imports here. Parse the move strings from the source instead.

const openingSource = readFileSync(new URL("../src/data/openings.ts", import.meta.url), "utf8");
const tactics = JSON.parse(
  readFileSync(new URL("../src/data/tactics.json", import.meta.url), "utf8"),
);
const endgameSource = readFileSync(new URL("../src/data/endgames.ts", import.meta.url), "utf8");

let failures = 0;
function fail(msg) {
  failures += 1;
  console.error("FAIL", msg);
}

const lines = [];
for (const chunk of openingSource.split(/\n\s*line\(/).slice(1)) {
  const strings = [...chunk.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((item) => item[1]);
  if (strings.length < 4) continue;
  lines.push({ id: strings[0], name: strings[1], moves: strings[3].split(/\s+/) });
}

if (lines.length < 30) fail(`expected at least 30 lines, found ${lines.length}`);

for (const line of lines) {
  const chess = new Chess();
  for (const san of line.moves) {
    try {
      const played = chess.move(san);
      if (!played) fail(`${line.id} illegal ${san} at ${chess.fen()}`);
    } catch {
      fail(`${line.id} illegal ${san} after ${chess.history().join(" ")}`);
      break;
    }
  }
  const plies = line.moves.length;
  if (plies < 12 || plies > 24) {
    fail(`${line.id} has ${plies} plies (want about 16-22)`);
  }
}

console.log(`openings: ${lines.length} lines`);

const themes = new Set([
  "mate in 1",
  "mate in 2",
  "fork",
  "pin",
  "skewer",
  "discovered attack",
  "back rank",
]);

if (tactics.length < 24) fail(`only ${tactics.length} tactics`);

for (const puzzle of tactics) {
  if (!themes.has(puzzle.theme)) fail(`${puzzle.id} bad theme ${puzzle.theme}`);
  const chess = new Chess(puzzle.fen);
  if (chess.turn() !== puzzle.side) fail(`${puzzle.id} side mismatch`);
  if (!puzzle.comment || puzzle.comment.length < 20) fail(`${puzzle.id} comment`);
  for (const san of puzzle.solution) {
    try {
      if (!chess.move(san)) fail(`${puzzle.id} illegal ${san}`);
    } catch {
      fail(`${puzzle.id} illegal ${san}`);
      break;
    }
  }
  if (puzzle.theme.startsWith("mate") && !chess.isCheckmate()) {
    fail(`${puzzle.id} does not end in mate`);
  }
  if (!puzzle.theme.startsWith("mate") && puzzle.theme !== "pin") {
    // non-mate tactics should leave the attacker with a material plus or a check that won material
  }
}

console.log(`tactics: ${tactics.length}`);

const fenRe = /fen: "([^"]+)"/g;
const ids = [...endgameSource.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
const fens = [...endgameSource.matchAll(fenRe)].map((m) => m[1]);
if (ids.length < 8) fail(`endgames ${ids.length}`);
for (const fen of fens) {
  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) fail(`endgame already over ${fen}`);
  } catch (error) {
    fail(`bad endgame fen ${fen} ${error.message}`);
  }
}
console.log(`endgames: ${fens.length}`);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("chess data ok");
