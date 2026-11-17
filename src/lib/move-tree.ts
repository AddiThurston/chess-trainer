import { parse, split } from "@mliebelt/pgn-parser";
import { Chess } from "chess.js";

/** One edge of a course tree: a move from one position to another. */
export type TreeMove = {
  from: string;
  san: string;
  uci: string;
  to: string;
  comment: string;
  nags: number[];
  shapes: string;
  ord: number;
};

export type ParsedChapter = {
  name: string;
  startFen: string;
  intro: string;
  sourceUrl: string;
  pgn: string;
};

export type ParsedPgn = {
  chapters: ParsedChapter[];
  moves: TreeMove[];
  warnings: string[];
};

type PgnMove = {
  notation: { notation: string };
  variations?: PgnMove[][];
  nag?: string[] | null;
  commentMove?: string;
  commentAfter?: string;
  commentDiag?: { colorArrows?: string[]; colorFields?: string[] } | null;
};

export const START_FEN = new Chess().fen();

// Move counters are dropped so the same position reached by another move order is the same node.
// chess.js only writes an en passant square when the capture is legal, so that field is safe to keep.
export function positionKey(fen: string) {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function keyToFen(key: string) {
  return `${key} 0 1`;
}

function shapesOf(move: PgnMove) {
  const arrows = move.commentDiag?.colorArrows ?? [];
  const fields = move.commentDiag?.colorFields ?? [];
  return `${arrows.length ? `[%cal ${arrows.join(",")}]` : ""}${fields.length ? `[%csl ${fields.join(",")}]` : ""}`;
}

function joinComments(...parts: (string | undefined)[]) {
  const seen: string[] = [];
  for (const part of parts) {
    const text = part?.trim();
    if (text && !seen.some((item) => item.includes(text))) seen.push(text);
  }
  return seen.join("\n\n");
}

export function parsePgn(pgn: string): ParsedPgn {
  const chapters: ParsedChapter[] = [];
  const warnings: string[] = [];
  const moves = new Map<string, TreeMove>();
  const childCount = new Map<string, number>();

  function add(from: string, played: { san: string; lan: string }, to: string, source: PgnMove) {
    const id = `${from} ${played.san}`;
    const nags = (source.nag ?? []).map((nag) => Number(nag.replace("$", ""))).filter(Number.isFinite);
    const comment = joinComments(source.commentMove, source.commentAfter);
    const shapes = shapesOf(source);
    const existing = moves.get(id);
    if (existing) {
      existing.comment = joinComments(existing.comment, comment);
      existing.nags = [...new Set([...existing.nags, ...nags])];
      existing.shapes ||= shapes;
      return;
    }
    const ord = childCount.get(from) ?? 0;
    childCount.set(from, ord + 1);
    moves.set(id, { from, san: played.san, uci: played.lan, to, comment, nags, shapes, ord });
  }

  function walk(line: PgnMove[], chess: Chess, chapter: string) {
    for (const move of line) {
      const before = chess.fen();
      let played;
      try {
        played = chess.move(move.notation.notation);
      } catch {
        played = null;
      }
      if (played) add(positionKey(before), played, positionKey(chess.fen()), move);
      else warnings.push(`${chapter}: skipped the rest of a line at ${move.notation.notation}, which is not legal there.`);
      for (const variation of move.variations ?? []) walk(variation, new Chess(before), chapter);
      if (!played) return;
    }
  }

  // The parser stops at the first syntax error, so each game is parsed alone and a bad chapter costs only itself.
  let games: { all: string }[];
  try {
    games = split(pgn.replace(/\r\n/g, "\n").trim(), { startRule: "games" });
  } catch {
    games = [];
  }

  games.forEach((raw, index) => {
    const fallback = `Chapter ${index + 1}`;
    let game;
    try {
      game = parse(raw.all, { startRule: "game" }) as unknown as {
        tags?: Record<string, unknown>;
        gameComment?: { comment?: string } | null;
        moves: PgnMove[];
      };
    } catch {
      warnings.push(`${fallback}: could not be read as PGN.`);
      return;
    }
    const tags = game.tags ?? {};
    const tag = (name: string) => (typeof tags[name] === "string" ? (tags[name] as string) : "");
    const name = tag("ChapterName") || tag("Event") || fallback;
    const variant = tag("Variant");
    if (variant && !["Standard", "From Position"].includes(variant)) {
      warnings.push(`${name}: skipped, ${variant} is not standard chess.`);
      return;
    }
    let chess;
    try {
      chess = new Chess(tag("FEN") || START_FEN);
    } catch {
      warnings.push(`${name}: skipped, the starting position is not valid.`);
      return;
    }
    chapters.push({ name, startFen: chess.fen(), intro: game.gameComment?.comment?.trim() ?? "", sourceUrl: tag("ChapterURL"), pgn: raw.all.trim() });
    walk(game.moves, chess, name);
  });

  if (!chapters.length) warnings.push("No chapters could be read from this PGN.");
  return { chapters, moves: [...moves.values()], warnings };
}

function childrenOf(moves: TreeMove[]) {
  const children = new Map<string, TreeMove[]>();
  for (const move of [...moves].sort((a, b) => a.ord - b.ord)) {
    const list = children.get(move.from);
    if (list) list.push(move);
    else children.set(move.from, [move]);
  }
  return children;
}

/** Lines are root-to-leaf paths. A repeated position ends its line. */
export function countLines(moves: TreeMove[], roots: string[]) {
  const children = childrenOf(moves);
  const memo = new Map<string, number>();
  const path = new Set<string>();
  function count(key: string): number {
    const known = memo.get(key);
    if (known !== undefined) return known;
    const next = children.get(key);
    if (!next || path.has(key)) return 1;
    path.add(key);
    const total = next.reduce((sum, move) => sum + count(move.to), 0);
    path.delete(key);
    memo.set(key, total);
    return total;
  }
  return [...new Set(roots)].filter((root) => children.has(root)).reduce((sum, root) => sum + count(root), 0);
}

/** The position where the course first branches, which is what a card thumbnail shows. */
export function keyPosition(moves: TreeMove[], root: string) {
  const children = childrenOf(moves);
  let key = root;
  for (let ply = 0; ply < 30; ply += 1) {
    const next = children.get(key);
    if (!next || next.length !== 1) break;
    key = next[0].to;
  }
  return key;
}

// A repertoire gives one move for its own side and many for the opponent, so the side that branches less is the student.
export function guessColor(moves: TreeMove[], tie: "w" | "b" = "w"): "w" | "b" {
  const branches = { w: 0, b: 0 };
  for (const move of moves) {
    if (move.ord > 0) branches[move.from.split(" ")[1] as "w" | "b"] += 1;
  }
  if (branches.w === branches.b) return tie;
  return branches.b < branches.w ? "b" : "w";
}

function tagValue(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ");
}

export function toPgn(
  course: { title: string; site: string; annotator: string },
  chapters: { name: string; startFen: string }[],
  moves: TreeMove[],
) {
  const children = childrenOf(moves);
  const games: string[] = [];
  const roots = new Set<string>();

  for (const chapter of chapters) {
    const root = positionKey(chapter.startFen);
    if (roots.has(root)) continue;
    roots.add(root);
    const seen = new Set<string>();

    const token = (move: TreeMove, ply: number, numbered: boolean) => {
      const number = Math.floor(ply / 2) + 1;
      const prefix = ply % 2 === 0 ? `${number}. ` : numbered ? `${number}... ` : "";
      const nags = move.nags.map((nag) => ` $${nag}`).join("");
      const note = `${move.comment} ${move.shapes}`.trim().replace(/}/g, ")");
      return `${prefix}${move.san}${nags}${note ? ` { ${note} }` : ""}`;
    };
    const annotated = (move: TreeMove) => Boolean(move.comment || move.shapes);

    // A position reached a second time is not expanded again, so transpositions do not repeat whole subtrees.
    const write = (key: string, ply: number, numbered: boolean): string => {
      const next = children.get(key);
      if (!next || seen.has(key)) return "";
      seen.add(key);
      const [main, ...alternatives] = next;
      const rest = write(main.to, ply + 1, alternatives.length > 0 || annotated(main));
      let text = token(main, ply, numbered);
      for (const move of alternatives) {
        const tail = write(move.to, ply + 1, annotated(move));
        text += ` (${token(move, ply, true)}${tail ? ` ${tail}` : ""})`;
      }
      return rest ? `${text} ${rest}` : text;
    };

    const [, turn, , , , fullmove] = chapter.startFen.split(" ");
    const startPly = (Number(fullmove) - 1) * 2 + (turn === "b" ? 1 : 0);
    const headers = [
      ["Event", `${course.title}: ${chapter.name}`],
      ["Site", course.site],
      ["Annotator", course.annotator],
      ...(chapter.startFen === START_FEN ? [] : [["SetUp", "1"], ["FEN", chapter.startFen]]),
      ["Result", "*"],
    ].filter(([, value]) => value);
    const body = write(root, startPly, true);
    games.push(`${headers.map(([name, value]) => `[${name} "${tagValue(value)}"]`).join("\n")}\n\n${body ? `${body} ` : ""}*`);
  }
  return `${games.join("\n\n\n")}\n`;
}
