export type EndgameGoal = "mate" | "promote" | "lucena" | "draw" | "activity" | "race";

export type EndgamePosition = {
  id: string;
  fen: string;
};

export type Endgame = {
  id: string;
  title: string;
  goal: string;
  goalType: EndgameGoal;
  user: "w" | "b";
  hint: string;
  positions: EndgamePosition[];
};

export const endgames: Endgame[] = [
  {
    id: "queen-mate",
    title: "King and queen vs king",
    goal: "Deliver checkmate. Do not stalemate the lone king.",
    goalType: "mate",
    user: "w",
    hint: "Use the queen to cut the king off, one rank or file at a time, and bring your own king in before the final mate.",
    positions: [
      { id: "center", fen: "8/8/8/4k3/8/8/8/4K2Q w - - 0 1" },
      { id: "file", fen: "8/8/4k3/8/8/8/8/3QK3 w - - 0 1" },
      { id: "queen-side", fen: "8/2k5/8/8/8/8/8/3QK3 w - - 0 1" },
      { id: "kingside", fen: "8/5k2/8/8/8/8/8/Q5K1 w - - 0 1" },
    ],
  },
  {
    id: "rook-mate",
    title: "King and rook vs king",
    goal: "Deliver checkmate. Keep the rook safe and leave the king a square until the mate.",
    goalType: "mate",
    user: "w",
    hint: "Cut the king off with the rook, oppose him with your king, and mate on the edge.",
    positions: [
      { id: "center", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1" },
      { id: "e-file", fen: "8/8/4k3/8/8/8/8/4R1K1 w - - 0 1" },
      { id: "back", fen: "4k3/8/8/8/8/8/4K3/4R3 w - - 0 1" },
      { id: "cut", fen: "8/6k1/8/8/8/8/8/4R1K1 w - - 0 1" },
    ],
  },
  {
    id: "opposition",
    title: "King and pawn vs king: the opposition",
    goal: "Promote the pawn and win. Outflank the enemy king before you push.",
    goalType: "promote",
    user: "w",
    hint: "The pawn push is not the first job. Step the king to the side so Black has to give way, then advance.",
    positions: [
      { id: "sixth", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1" },
      { id: "shoulder", fen: "4k3/8/3K4/3P4/8/8/8/8 w - - 0 1" },
      { id: "c-pawn", fen: "8/8/k7/2P5/2K5/8/8/8 w - - 0 1" },
      { id: "d-pawn", fen: "8/2k5/3K4/3P4/8/8/8/8 w - - 0 1" },
      { id: "opposition", fen: "8/8/4k3/8/4K3/4P3/8/8 b - - 0 1" },
    ],
  },
  {
    id: "outside-passer",
    title: "Outside passed pawn",
    goal: "Use the distant passed pawn as a decoy, then win on the other wing.",
    goalType: "promote",
    user: "w",
    hint: "Rushing the passed pawn lets the enemy king catch it. Improve your king first, and only push when Black has to abandon the other pawns.",
    positions: [
      { id: "b-pawn", fen: "8/6k1/5pp1/8/8/1P4P1/5P2/6K1 w - - 0 1" },
      { id: "split", fen: "8/6k1/2p2p2/8/1P6/6P1/5P2/6K1 w - - 0 1" },
      { id: "central", fen: "8/5k2/6p1/5p2/8/1P4P1/5P2/4K3 w - - 0 1" },
      { id: "far-king", fen: "8/5pk1/6p1/8/8/1P4P1/5P2/4K3 w - - 0 1" },
    ],
  },
  {
    id: "lucena",
    title: "Lucena position",
    goal: "Promote the pawn or win the rook. Build a bridge for your king.",
    goalType: "lucena",
    user: "w",
    hint: "Your king is in front of the pawn. Put the rook on the fourth rank so it can shield the king from checks.",
    positions: [
      { id: "b-pawn", fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1" },
      { id: "g-pawn", fen: "6K1/6P1/6k1/8/8/8/6r1/4R3 w - - 0 1" },
      { id: "a-pawn-bridge", fen: "K1k5/P7/8/8/8/8/1r6/R7 w - - 0 1" },
      { id: "c-pawn", fen: "2K1k3/2P5/8/8/8/8/r7/3R4 w - - 0 1" },
    ],
  },
  {
    id: "philidor",
    title: "Philidor position",
    goal: "Hold the draw. Keep the rook on the sixth rank until the pawn steps up, then check from behind.",
    goalType: "draw",
    user: "b",
    hint: "Do not check yet. Stay on the sixth rank. When White plays the pawn to the sixth, swing the rook behind it and check from the rear.",
    positions: [
      { id: "e-file", fen: "4k3/8/r7/4K3/4P3/8/8/4R3 b - - 0 1" },
      { id: "sixth", fen: "8/4k3/4r3/4P3/4K3/8/8/4R3 b - - 0 1" },
      { id: "f-file", fen: "5k2/8/5r2/8/4K3/5P2/8/4R3 b - - 0 1" },
      { id: "d-file", fen: "3k4/8/3r4/8/4K3/3P4/8/R7 b - - 0 1" },
    ],
  },
  {
    id: "king-activity",
    title: "King activity",
    goal: "Take the opposition, outflank, and win the pawn.",
    goalType: "activity",
    user: "w",
    hint: "The pawn race is a distraction. Shoulder the enemy king off the key squares, then take the pawn.",
    positions: [
      { id: "b-file", fen: "8/8/8/2k5/1pP5/1P1K4/8/8 b - - 0 1" },
      { id: "c-file", fen: "8/8/8/3k4/2pP4/2P1K3/8/8 b - - 0 1" },
      { id: "a-side", fen: "8/8/8/k7/1pP5/1P1K4/8/8 b - - 0 1" },
      { id: "to-move", fen: "8/8/8/2k5/1pP5/1P6/3K4/8 w - - 0 1" },
      { id: "deep", fen: "8/2k5/8/1pP5/1P1K4/8/8/8 b - - 0 1" },
    ],
  },
  {
    id: "pawn-race",
    title: "Pawn race",
    goal: "Win the race. Count the moves, and do not push if your king has to step first.",
    goalType: "race",
    user: "w",
    hint: "Both pawns can run. Check whether a king move gains a tempo or stops the enemy pawn before you push.",
    positions: [
      { id: "shoulder", fen: "8/p7/8/8/8/8/6P1/k1K5 w - - 0 1" },
      { id: "g-pawn", fen: "8/8/p7/8/8/6P1/8/k1K5 w - - 0 1" },
      { id: "count", fen: "8/k7/8/p7/8/8/6P1/4K3 w - - 0 1" },
      { id: "distant", fen: "k7/8/1p6/8/8/8/6P1/6K1 w - - 0 1" },
    ],
  },
];

export function getEndgame(id: string): Endgame | undefined {
  return endgames.find((endgame) => endgame.id === id);
}

export function previewFen(endgame: Endgame): string {
  return endgame.positions[0]?.fen ?? "8/8/8/8/8/8/8/8 w - - 0 1";
}
