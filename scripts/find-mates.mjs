import { Chess } from "chess.js";

function mateIn(fen, plies) {
  const chess = new Chess(fen);
  const attacker = chess.turn();
  function search(d, line) {
    if (chess.isCheckmate()) return line;
    if (d === 0 || chess.isGameOver()) return null;
    const moves = chess.moves();
    if (chess.turn() === attacker) {
      for (const m of moves) {
        chess.move(m);
        const found = search(d - 1, [...line, m]);
        chess.undo();
        if (found) return found;
      }
      return null;
    }
    let sample = null;
    for (const m of moves) {
      chess.move(m);
      const found = search(d - 1, [...line, m]);
      chess.undo();
      if (!found) return null;
      if (!sample) sample = found;
    }
    return sample;
  }
  return search(plies, []);
}

const fens = process.argv.slice(2);
if (!fens.length) {
  console.log("usage: node scripts/find-mates.mjs FEN");
  process.exit(1);
}
for (const fen of fens) {
  const chess = new Chess();
  try {
    chess.load(fen);
  } catch (e) {
    console.log("BAD", fen, e.message);
    continue;
  }
  const one = mateIn(fen, 1);
  const two = one ? null : mateIn(fen, 3);
  console.log(fen);
  console.log("  m1", one);
  console.log("  m2", two);
}
