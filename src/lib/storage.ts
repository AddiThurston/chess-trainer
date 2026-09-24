export type LineStats = {
  bestCleanStreak: number;
  currentStreak: number;
  totalMistakes: number;
  attempts: number;
};

const OPENING_KEY = "chess-trainer-openings-v1";
const TACTIC_KEY = "chess-trainer-tactics-v1";
const EMPTY_OPENINGS: Record<string, LineStats> = {};
const EMPTY_TACTICS: string[] = [];

const openingListeners = new Set<() => void>();
const tacticListeners = new Set<() => void>();
let openingCache: Record<string, LineStats> | null = null;
let openingRaw: string | null = null;
let tacticCache: string[] | null = null;
let tacticRaw: string | null = null;

export function emptyLineStats(): LineStats {
  return { bestCleanStreak: 0, currentStreak: 0, totalMistakes: 0, attempts: 0 };
}

export function lineKey(openingId: string, lineId: string, color: "white" | "black") {
  return `${openingId}:${lineId}:${color}`;
}

function notify(listeners: Set<() => void>) {
  for (const listener of listeners) listener();
}

export function subscribeOpeningStats(listener: () => void) {
  openingListeners.add(listener);
  return () => openingListeners.delete(listener);
}

export function emptyOpeningSnapshot() {
  return EMPTY_OPENINGS;
}

export function loadOpeningStats(): Record<string, LineStats> {
  if (typeof window === "undefined") return EMPTY_OPENINGS;
  const raw = window.localStorage.getItem(OPENING_KEY) ?? "";
  if (openingCache && openingRaw === raw) return openingCache;
  openingRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Record<string, LineStats>) : {};
    openingCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    openingCache = {};
  }
  return openingCache;
}

function saveOpeningStats(stats: Record<string, LineStats>) {
  const raw = JSON.stringify(stats);
  window.localStorage.setItem(OPENING_KEY, raw);
  openingRaw = raw;
  openingCache = stats;
  notify(openingListeners);
}

export function recordOpeningMistake(stats: Record<string, LineStats>, key: string) {
  const current = stats[key] ?? emptyLineStats();
  const next = {
    ...stats,
    [key]: { ...current, totalMistakes: current.totalMistakes + 1 },
  };
  saveOpeningStats(next);
  return next;
}

export function recordOpeningFinish(
  stats: Record<string, LineStats>,
  key: string,
  clean: boolean,
) {
  const current = stats[key] ?? emptyLineStats();
  const currentStreak = clean ? current.currentStreak + 1 : 0;
  const next = {
    ...stats,
    [key]: {
      ...current,
      attempts: current.attempts + 1,
      currentStreak,
      bestCleanStreak: Math.max(current.bestCleanStreak, currentStreak),
    },
  };
  saveOpeningStats(next);
  return next;
}

export function openingSummary(stats: Record<string, LineStats>, openingId: string, color: "white" | "black") {
  let best = 0;
  let mistakes = 0;
  let attempts = 0;
  for (const [key, value] of Object.entries(stats)) {
    if (!key.startsWith(`${openingId}:`) || !key.endsWith(`:${color}`)) continue;
    best = Math.max(best, value.bestCleanStreak || 0);
    mistakes += value.totalMistakes || 0;
    attempts += value.attempts || 0;
  }
  return { best, mistakes, attempts };
}

export function subscribeTactics(listener: () => void) {
  tacticListeners.add(listener);
  return () => tacticListeners.delete(listener);
}

export function emptyTacticSnapshot() {
  return EMPTY_TACTICS;
}

export function loadSolvedTactics(): string[] {
  if (typeof window === "undefined") return EMPTY_TACTICS;
  const raw = window.localStorage.getItem(TACTIC_KEY) ?? "";
  if (tacticCache && tacticRaw === raw) return tacticCache;
  tacticRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as { solved?: string[] }) : {};
    tacticCache = Array.isArray(parsed.solved) ? parsed.solved : [];
  } catch {
    tacticCache = [];
  }
  return tacticCache;
}

function saveTactics(solved: string[]) {
  const raw = JSON.stringify({ solved });
  window.localStorage.setItem(TACTIC_KEY, raw);
  tacticRaw = raw;
  tacticCache = solved;
  notify(tacticListeners);
}

export function markTacticSolved(id: string) {
  const solved = new Set(loadSolvedTactics());
  solved.add(id);
  const list = [...solved];
  saveTactics(list);
  return list;
}

export function resetSolvedTactics() {
  saveTactics([]);
  return emptyTacticSnapshot();
}
