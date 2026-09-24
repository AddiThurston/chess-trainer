import { Chess } from "chess.js";

export type OpeningLine = {
  id: string;
  name: string;
  note: string;
  moves: string[];
};

export type Opening = {
  id: string;
  name: string;
  idea: string;
  lines: OpeningLine[];
};

function line(id: string, name: string, note: string, sans: string): OpeningLine {
  return { id, name, note, moves: sans.split(/\s+/) };
}

export const openings: Opening[] = [
  {
    id: "caro-kann",
    name: "Caro-Kann",
    idea: "Black answers 1.e4 with ...c6 and ...d5, then develops the light-squared bishop outside the pawn chain.",
    lines: [
      line(
        "classical",
        "Classical main line",
        "Black trades on e4 and plants the bishop on f5 before playing ...e6.",
        "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6",
      ),
      line(
        "advance",
        "Advance variation",
        "White pushes e5 and Black chips at the center with ...c5.",
        "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7 c4 Nbc6 Nc3 a6",
      ),
      line(
        "exchange",
        "Exchange variation",
        "White trades on d5 and both sides develop toward an open c-file.",
        "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6",
      ),
      line(
        "panov",
        "Panov-Botvinnik attack",
        "White recaptures with the c-pawn and plays an isolated queen-pawn position.",
        "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7 cxd5 Nxd5 Bd3 Nc6 O-O O-O",
      ),
    ],
  },
  {
    id: "french",
    name: "French Defense",
    idea: "Black meets 1.e4 with ...e6 and ...d5, accepting a cramped light-squared bishop for a solid center.",
    lines: [
      line(
        "winawer",
        "Winawer, poisoned pawn",
        "Black gives up the dark-squared bishop and counterattacks the white center.",
        "e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4",
      ),
      line(
        "classical",
        "Classical variation",
        "The knight on f6 is driven to d7, and Black strikes with ...c5.",
        "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 Nf3 c5 dxc5 Nc6 Bf4 Bxc5 Bd3 f6 exf6 Nxf6",
      ),
      line(
        "tarrasch",
        "Tarrasch variation",
        "White develops the knight to d2 so the pawn chain stays intact.",
        "e4 e6 d4 d5 Nd2 c5 exd5 Qxd5 Ngf3 cxd4 Bc4 Qd6 O-O Nf6 Nb3 Nc6 Nbxd4 Nxd4",
      ),
      line(
        "advance",
        "Advance variation",
        "White closes the center with e5 and Black builds on the queenside with ...c4.",
        "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2 Bd7 O-O Ne7 Rb1",
      ),
    ],
  },
  {
    id: "italian",
    name: "Italian Game",
    idea: "White puts the bishop on c4 early and aims at f7, either quietly or by opening the center.",
    lines: [
      line(
        "giuoco-piano",
        "Giuoco Piano",
        "Both sides occupy the center and White opens the d-file with c3 and d4.",
        "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Bxc3 d5 Bf6 Re1 Ne7",
      ),
      line(
        "pianissimo",
        "Giuoco Pianissimo",
        "White keeps the center closed with d3 and maneuvers behind the pawn chain.",
        "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 Bb3 Ba7 Nbd2 O-O h3 h6 Re1",
      ),
      line(
        "two-knights",
        "Two Knights Defense",
        "Black develops the knight to f6 and meets Ng5 with ...d5.",
        "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6",
      ),
      line(
        "evans",
        "Evans Gambit",
        "White gives the b-pawn to open lines and build a pawn center.",
        "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6 e5 Qg6 Nxc3 Nge7",
      ),
    ],
  },
  {
    id: "sicilian",
    name: "Sicilian Defense",
    idea: "Black fights for the center from the flank with ...c5 and takes an asymmetrical game.",
    lines: [
      line(
        "najdorf",
        "Najdorf, English attack",
        "Black plays ...a6 and ...e5, and both sides castle on opposite wings.",
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7",
      ),
      line(
        "dragon",
        "Dragon, Yugoslav attack",
        "Black fianchettoes the king's bishop and White castles queenside for a pawn storm.",
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8",
      ),
      line(
        "scheveningen",
        "Scheveningen",
        "Black keeps a small center with ...e6 and ...d6 and develops the dark-squared bishop.",
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 Be2 Be7 O-O O-O f4 Nc6 Be3 a6 a4 Qc7",
      ),
      line(
        "sveshnikov",
        "Sveshnikov",
        "Black drives the knight with ...e5 and accepts a hole on d5 in return for activity.",
        "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6",
      ),
      line(
        "closed",
        "Closed Sicilian",
        "White keeps the center closed, fianchettoes the light-squared bishop, and expands with f4.",
        "e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O Be3 Nd4 Qd2",
      ),
    ],
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    idea: "The bishop on b5 pressures the knight that defends e5, and White builds a slow squeeze.",
    lines: [
      line(
        "breyer",
        "Closed, Breyer",
        "Black retreats the knight from c6 to b8 so ...Nbd7 can support ...c5 or ...d5.",
        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7",
      ),
      line(
        "berlin",
        "Berlin Defense",
        "Black captures on e4 and heads for the queenless Berlin endgame.",
        "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Nc3 Be6 h3",
      ),
      line(
        "exchange",
        "Exchange variation",
        "White gives up the bishop pair to damage Black's queenside pawns.",
        "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4 f3",
      ),
      line(
        "marshall",
        "Marshall attack",
        "Black sacrifices a pawn with ...d5 to open lines against the white king. The tabiya is ...c6.",
        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6",
      ),
    ],
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    idea: "White offers the c-pawn to pull Black's d-pawn off the center, then plays against the resulting structure.",
    lines: [
      line(
        "orthodox",
        "Queen's Gambit Declined",
        "Black holds d5 with ...e6 and develops the dark-squared bishop before breaking the pin.",
        "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7",
      ),
      line(
        "accepted",
        "Queen's Gambit Accepted",
        "Black takes on c4 and gives the pawn back after ...c5, aiming for free piece play.",
        "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Be7",
      ),
      line(
        "exchange",
        "Exchange variation",
        "White trades on d5 and uses the half-open c-file against Black's pawn on c6.",
        "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 O-O Qc2 Nbd7 Nf3 Re8 O-O Nf8",
      ),
      line(
        "tarrasch",
        "Tarrasch Defense",
        "Black answers ...c5 and accepts an isolated d-pawn for active pieces.",
        "d4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O Bg5 cxd4 Nxd4 h6",
      ),
    ],
  },
  {
    id: "london",
    name: "London System",
    idea: "White develops the dark-squared bishop to f4 before closing the pawn chain, and keeps a sturdy setup.",
    lines: [
      line(
        "vs-d5",
        "London against ...d5",
        "Black meets Bf4 with ...Bd6, and the bishops are often exchanged on g3.",
        "d4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 Bxg3 hxg3 Qe7",
      ),
      line(
        "vs-kingside",
        "London against a kingside fianchetto",
        "Black sets up with ...g6 and ...d6, and White keeps the bishop outside the chain.",
        "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 O-O Be2 Nbd7 O-O Qe8 c4 e5 Bh2 Qe7",
      ),
      line(
        "jobava",
        "Jobava London",
        "White develops the queen's knight to c3 early and keeps the option of e4.",
        "d4 d5 Nc3 Nf6 Bf4 Bf5 e3 e6 Nf3 Bd6 Ne5 O-O Bd3 c5 dxc5 Bxc5",
      ),
    ],
  },
  {
    id: "kings-indian",
    name: "King's Indian",
    idea: "Black fianchettoes the king's bishop, allows White a broad center, then strikes with ...e5 or ...c5.",
    lines: [
      line(
        "mar-del-plata",
        "Classical, Mar del Plata",
        "White closes the center with d5 and Black prepares ...f5.",
        "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5",
      ),
      line(
        "samisch",
        "Sämisch variation",
        "White plays f3 and Be3, building a broad center and often castling queenside.",
        "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2 f5 O-O-O Nd7 Bd3 Ndf6",
      ),
      line(
        "fianchetto",
        "Fianchetto system",
        "White fianchettoes as well and plays a slower central game.",
        "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Re8 Be3",
      ),
      line(
        "orthodox",
        "Classical with ...Nbd7",
        "Black develops the knight to d7 and keeps the option of ...c6 and ...a6.",
        "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nbd7 Re1 c6 Bf1 a6 Rb1",
      ),
    ],
  },
  {
    id: "scotch",
    name: "Scotch Game",
    idea: "White opens the center on move three with d4 and trades a knight for rapid piece play.",
    lines: [
      line(
        "mieses",
        "Classical, Mieses",
        "White exchanges on c6, pushes e5, and meets ...Nd5 with c4.",
        "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Nb6 Nc3 Qe6 Qe4 Bb4",
      ),
      line(
        "four-knights",
        "Scotch Four Knights",
        "Both knights come out before the center opens, and White pins the knight on f6.",
        "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6",
      ),
      line(
        "schmidt",
        "Schmidt variation",
        "White develops the bishop to c4 instead of taking on d4, and Black anchors a knight on e4.",
        "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 f3 Ng5",
      ),
    ],
  },
  {
    id: "slav",
    name: "Slav Defense",
    idea: "Black supports ...d5 with ...c6 so the light-squared bishop can develop outside the pawn chain.",
    lines: [
      line(
        "main",
        "Main line",
        "Black takes on c4 and develops the bishop to f5 before playing ...e6.",
        "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2 Bg6 Rd1 Nbd7",
      ),
      line(
        "exchange",
        "Exchange variation",
        "White trades on d5 and both light-squared bishops are exchanged on d3.",
        "d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Nf3 Nc6 Bf4 Bf5 e3 e6 Bd3 Bxd3 Qxd3 Bd6 Bxd6 Qxd6",
      ),
      line(
        "meran",
        "Semi-Slav, Meran",
        "Black plays ...e6 before developing the light-squared bishop, then expands with ...b5.",
        "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5",
      ),
      line(
        "chebanenko",
        "Chebanenko",
        "Black plays ...a6 early, keeping the option of ...b5 without committing the light-squared bishop.",
        "d4 d5 c4 c6 Nf3 Nf6 Nc3 a6 e3 b5 b3 Bg4 Be2 e6 O-O Be7 h3 Bh5 Bb2 Nbd7",
      ),
    ],
  },
];

export function getOpening(id: string): Opening | undefined {
  return openings.find((opening) => opening.id === id);
}

/** Position after the moves every variation of this opening still shares. */
export function openingTabiya(opening: Opening): string {
  const sequences = opening.lines.map((line) => line.moves);
  let shared = 0;
  const first = sequences[0] ?? [];
  while (shared < first.length && sequences.every((moves) => moves[shared] === first[shared])) {
    shared += 1;
  }
  const chess = new Chess();
  for (let index = 0; index < shared; index += 1) chess.move(first[index]);
  return chess.fen();
}

export function bookMove(history: string[], san: string): boolean {
  const next = [...history, san];
  return openings.some((opening) =>
    opening.lines.some((line) => next.every((move, index) => line.moves[index] === move)),
  );
}
