export type EndgameGoal = "mate" | "promote" | "lucena" | "draw" | "activity" | "race";

export type Endgame = {
  id: string;
  title: string;
  goal: string;
  goalType: EndgameGoal;
  fen: string;
  user: "w" | "b";
  hint: string;
};

export const endgames: Endgame[] = [
  {
    id: "queen-mate",
    title: "King and queen vs king",
    goal: "Deliver checkmate. Do not stalemate the lone king.",
    goalType: "mate",
    fen: "8/8/8/4k3/8/8/8/Q3K3 w - - 0 1",
    user: "w",
    hint: "Use the queen to cut the king off, one rank or file at a time, and bring your own king in before the final mate.",
  },
  {
    id: "rook-mate",
    title: "King and rook vs king",
    goal: "Deliver checkmate. Keep the rook safe and leave the king a square until the mate.",
    goalType: "mate",
    fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1",
    user: "w",
    hint: "Cut the king off with the rook, oppose him with your king, and mate on the edge.",
  },
  {
    id: "opposition",
    title: "King and pawn vs king: the opposition",
    goal: "Promote the pawn and win. Your king has the opposition.",
    goalType: "promote",
    fen: "8/8/4k3/8/4K3/4P3/8/8 w - - 0 1",
    user: "w",
    hint: "Outflank with the king before you push. If you push too soon, Black's king steps in front of the pawn.",
  },
  {
    id: "outside-passer",
    title: "Outside passed pawn",
    goal: "Promote the passed b-pawn, or use it to win Black's kingside pawns.",
    goalType: "promote",
    fen: "8/5pk1/6p1/8/1PK5/6P1/5P2/8 w - - 0 1",
    user: "w",
    hint: "The b-pawn is outside Black's king. Push it so the king has to come across, then turn to the kingside.",
  },
  {
    id: "lucena",
    title: "Lucena position",
    goal: "Promote the pawn or win the rook. Build a bridge for your king.",
    goalType: "lucena",
    fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1",
    user: "w",
    hint: "Your king is in front of the pawn. Put the rook on the fourth rank so it can shield the king from checks.",
  },
  {
    id: "philidor",
    title: "Philidor position",
    goal: "Hold the draw. Keep the rook on the sixth rank until the pawn steps up, then check from behind.",
    goalType: "draw",
    fen: "4k3/8/r7/4K3/4P3/8/8/4R3 b - - 0 1",
    user: "b",
    hint: "Do not check yet. Stay on the sixth rank. When White plays e5, swing the rook to the e-file and check from the rear.",
  },
  {
    id: "king-activity",
    title: "King activity",
    goal: "Take the opposition, invade, and win the pawn.",
    goalType: "activity",
    fen: "8/8/4k3/2p5/2P5/4K3/8/8 b - - 0 1",
    user: "w",
    hint: "Black has to move and give up the opposition. Meet the king, then walk around to the pawn.",
  },
  {
    id: "pawn-race",
    title: "Pawn race",
    goal: "Promote your pawn first, and do not let Black promote.",
    goalType: "race",
    fen: "8/6p1/8/8/P7/8/8/k1K5 w - - 0 1",
    user: "w",
    hint: "Count the moves. Your pawn is further along. Promote, then stop the g-pawn with the new queen.",
  },
];

export function getEndgame(id: string): Endgame | undefined {
  return endgames.find((endgame) => endgame.id === id);
}
