import assert from "node:assert/strict";
import { countLines, guessColor, keyPosition, parsePgn, positionKey, toPgn, START_FEN } from "../src/lib/move-tree.ts";

const study = `[Event "Italian for White: Main line"]
[ChapterName "Main line"]

{ A calm setup. } 1. e4 e5 2. Nf3 Nc6 (2... Nf6 $5 { The Petroff. } 3. Nxe5 d6 4. Nf3 Nxe4) (2... d6 3. d4) 3. Bc4 $1 { The bishop eyes f7. [%cal Gc4f7][%csl Rf7] } Bc5 (3... Nf6 4. d3 Bc5) 4. c3 Nf6 5. d3 *

[Event "Italian for White: Move orders"]
[ChapterName "Move orders"]

1. e4 e5 2. Bc4 Nc6 3. Nf3 Nf6 4. d3 Bc5 { Same position as the main line. } 5. c3 *

[Event "Italian for White: A rook ending"]
[ChapterName "A rook ending"]
[SetUp "1"]
[FEN "8/8/4k3/8/8/4K3/4P3/7R b - - 0 40"]

40... Kd5 41. Rh5+ (41. Kd3 Kc5) 41... Kc4 *

[Event "Broken"]

1. e4 e5 2. Ke3 Nf6 *
`;

const first = parsePgn(study);
assert.equal(first.chapters.length, 4);
assert.equal(first.chapters[0].name, "Main line");
assert.equal(first.chapters[0].intro, "A calm setup.");
assert.equal(first.warnings.length, 1, first.warnings.join("\n"));
assert.match(first.warnings[0], /Ke3/);

const bc4 = first.moves.find((move) => move.san === "Bc4" && move.ord === 0 && move.comment);
assert.deepEqual(bc4.nags, [1]);
assert.equal(bc4.comment, "The bishop eyes f7.");
assert.equal(bc4.shapes, "[%cal Gc4f7][%csl Rf7]");

// 2.Bc4 Nc6 3.Nf3 transposes into the main line, so no position after it is stored twice.
const keys = first.moves.map((move) => `${move.from} ${move.san}`);
assert.equal(new Set(keys).size, keys.length);
const afterNc6Bc4 = first.moves.filter((move) => move.san === "Bc5" || move.san === "Nf6").map((move) => move.from);
assert.ok(afterNc6Bc4.length >= 2);

assert.equal(guessColor(first.moves), "w");
const roots = first.chapters.map((chapter) => positionKey(chapter.startFen));
assert.ok(countLines(first.moves, roots) >= 6);
assert.notEqual(keyPosition(first.moves, positionKey(START_FEN)), positionKey(START_FEN));

const exported = toPgn({ title: "Italian for White", site: "", annotator: "A. Player" }, first.chapters, first.moves);
const second = parsePgn(exported);
assert.equal(second.warnings.length, 0, second.warnings.join("\n"));
const flat = (moves) => moves.map((move) => `${move.from}|${move.san}|${move.to}|${move.comment}|${move.nags}|${move.shapes}`).sort();
assert.deepEqual(flat(second.moves), flat(first.moves));
assert.match(exported, /40\.\.\. Kd5/);

assert.equal(parsePgn("not a pgn at all {").chapters.length, 0);
console.log(`move tree: ${first.moves.length} moves, ${countLines(first.moves, roots)} lines, round trip ok`);
