export const STOCKFISH_HINT =
  "Install Stockfish on the server (sudo apt install stockfish) and set STOCKFISH_PATH if the binary is not on PATH. On Debian it is often /usr/games/stockfish.";

export const levelIds = ["beginner", "casual", "club", "tournament", "master"] as const;

export type LevelId = (typeof levelIds)[number];

export type Level = {
  id: LevelId;
  label: string;
  blurb: string;
  skill: number;
  elo: number;
  depth: number;
  movetime: number;
  limitStrength: boolean;
};

export const levels: Record<LevelId, Level> = {
  beginner: {
    id: "beginner",
    label: "Beginner",
    blurb: "Short sights and soft play. Hangs happen.",
    skill: 0,
    elo: 1320,
    depth: 1,
    movetime: 80,
    limitStrength: true,
  },
  casual: {
    id: "casual",
    label: "Casual",
    blurb: "A club-night friend who still drops a pawn.",
    skill: 4,
    elo: 1450,
    depth: 4,
    movetime: 140,
    limitStrength: true,
  },
  club: {
    id: "club",
    label: "Club",
    blurb: "Solid, a bit slow, and hard to trick twice.",
    skill: 10,
    elo: 1750,
    depth: 8,
    movetime: 280,
    limitStrength: true,
  },
  tournament: {
    id: "tournament",
    label: "Tournament",
    blurb: "Looks for tactics and does not forgive a loose piece.",
    skill: 16,
    elo: 2200,
    depth: 12,
    movetime: 500,
    limitStrength: true,
  },
  master: {
    id: "master",
    label: "Master",
    blurb: "Full strength within a longer think. Bring your best.",
    skill: 20,
    elo: 2800,
    depth: 16,
    movetime: 900,
    limitStrength: false,
  },
};

export function isLevelId(value: string): value is LevelId {
  return (levelIds as readonly string[]).includes(value);
}

/** Full-strength search used when the opponent must play the position correctly. */
export const exactSearch = {
  skill: 20,
  elo: 3200,
  depth: 18,
  movetime: 2500,
  limitStrength: false,
};

export type SearchConfig = {
  skill: number;
  elo: number;
  depth: number;
  movetime: number;
  limitStrength: boolean;
};

export function searchConfig(level: string): SearchConfig | null {
  if (level === "exact") return exactSearch;
  if (!isLevelId(level)) return null;
  const found = levels[level];
  return {
    skill: found.skill,
    elo: found.elo,
    depth: found.depth,
    movetime: found.movetime,
    limitStrength: found.limitStrength,
  };
}
