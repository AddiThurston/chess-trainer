import assert from "node:assert/strict";
import { parseInputs } from "../src/lib/lichess-inputs.ts";
import { splitStudies } from "../src/lib/lichess.ts";
import { classifyOpening } from "../src/lib/openings.ts";
import { parsePgn, START_FEN } from "../src/lib/move-tree.ts";

const inputs = parseInputs(`https://lichess.org/study/AbCd1234
https://lichess.org/study/WxYz9876/chap1234#3
EfGh5678, @GothamChess
https://lichess.org/@/DrNykterstein
https://lichess.org/study/by/Penguingm1
@abcdefgh  not/a/thing  x`);
assert.deepEqual(inputs.studies, ["AbCd1234", "WxYz9876", "EfGh5678"]);
assert.deepEqual(inputs.users, ["gothamchess", "drnykterstein", "penguingm1", "abcdefgh"]);
assert.deepEqual(inputs.unknown, ["not/a/thing", "x"]);

const exported = `[Event "Two studies: A"]
[StudyName "Two studies"]
[ChapterName "A"]
[ChapterURL "https://lichess.org/study/AAAAAAA1/ch000001"]
[Annotator "https://lichess.org/@/SomeGM"]
[Orientation "black"]

1. e4 c5 *

[Event "Other: B"]
[StudyName "Other"]
[ChapterName "B"]
[ChapterURL "https://lichess.org/study/AAAAAAA2/ch000002"]
[Annotator "https://lichess.org/@/SomeGM"]

1. d4 d5 *
`;
const studies = splitStudies(exported);
assert.equal(studies.length, 2);
assert.equal(studies[0].author, "SomeGM");
assert.equal(studies[0].chapters[0].orientation, "b");
assert.equal(studies[1].chapters[0].orientation, null);

const najdorf = parsePgn("1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. h3 *");
assert.match(classifyOpening(najdorf.moves, START_FEN).name, /^Sicilian Defense: Najdorf Variation/);
assert.equal(classifyOpening(najdorf.moves, "8/8/8/8/8/8/8/K6k w - - 0 1").name, "");
console.log("inputs, study split, and opening classification ok");
