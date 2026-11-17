import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { split } from "@mliebelt/pgn-parser";

const BASE = process.env.LICHESS_BASE_URL ?? "https://lichess.org";
const CONTACT = process.env.CONTACT_URL ?? "https://addithurston.com";
const CACHE_DIR = process.env.LICHESS_CACHE_DIR ?? ".lichess-cache";
const CACHE_MS = 24 * 60 * 60 * 1000;
// Lichess asks for a full minute after a 429.
const RETRY_MS = 65_000;
const RETRIES = 5;

export type LichessUser = { id: string; username: string; title?: string; disabled?: boolean; tosViolation?: boolean };

export type FetchedStudy = {
  id: string;
  name: string;
  author: string;
  chapters: { chapterId: string; name: string; orientation: "w" | "b" | null; pgn: string }[];
};

export class LichessError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path: string, init: RequestInit, onWait: () => Promise<void>) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...init.headers, "User-Agent": `Tabiya opening trainer (${CONTACT})` },
    });
    if (response.status !== 429) return response;
    await onWait();
    await sleep(RETRY_MS);
  }
  throw new LichessError("Lichess kept answering 429 (too many requests). Try again later.");
}

export async function fetchUsers(usernames: string[], onWait: () => Promise<void>) {
  const found: LichessUser[] = [];
  for (let start = 0; start < usernames.length; start += 300) {
    const response = await request(
      "/api/users?profile=false",
      { method: "POST", headers: { "Content-Type": "text/plain" }, body: usernames.slice(start, start + 300).join(",").toLowerCase() },
      onWait,
    );
    if (!response.ok) throw new LichessError(`The Lichess user lookup answered ${response.status}.`);
    found.push(...((await response.json()) as LichessUser[]));
  }
  return found;
}

async function cachedPgn(file: string, path: string, fresh: boolean, onWait: () => Promise<void>) {
  const cached = join(CACHE_DIR, file);
  if (!fresh) {
    const age = await stat(cached).then((info) => Date.now() - info.mtimeMs, () => Infinity);
    if (age < CACHE_MS) return readFile(cached, "utf8");
  }
  const response = await request(`${path}?orientation=true`, { headers: { Accept: "application/x-chess-pgn" } }, onWait);
  if (response.status === 404) throw new LichessError("Lichess has no public studies there.");
  if (!response.ok) throw new LichessError(`Lichess answered ${response.status}.`);
  const pgn = await response.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, pgn);
  return pgn;
}

export function fetchStudyPgn(id: string, fresh: boolean, onWait: () => Promise<void>) {
  return cachedPgn(`study-${id}.pgn`, `/api/study/${id}.pgn`, fresh, onWait);
}

// A study fetched on its own is newer than the author's cached export, which would otherwise roll it back.
export function forgetUserPgn(username: string) {
  return rm(join(CACHE_DIR, `user-${username.toLowerCase()}.pgn`), { force: true });
}

export function fetchUserPgn(username: string, fresh: boolean, onWait: () => Promise<void>) {
  return cachedPgn(`user-${username.toLowerCase()}.pgn`, `/api/study/by/${username}/export.pgn`, fresh, onWait);
}

function tag(pgn: string, name: string) {
  return pgn.match(new RegExp(`^\\[${name} "(.*)"\\]`, "m"))?.[1] ?? "";
}

/** Groups an export's chapters by study, using the ChapterURL tag Lichess writes on every chapter. */
export function splitStudies(pgn: string): FetchedStudy[] {
  const studies = new Map<string, FetchedStudy>();
  for (const game of split(pgn.replace(/\r\n/g, "\n").trim(), { startRule: "games" })) {
    const text = game.all.trim();
    const url = tag(text, "ChapterURL").match(/study\/([A-Za-z0-9]{8})\/([A-Za-z0-9]{8})/);
    if (!url) continue;
    const study = studies.get(url[1]) ?? {
      id: url[1],
      name: tag(text, "StudyName"),
      author: tag(text, "Annotator").match(/lichess\.org\/@\/([\w-]+)/)?.[1] ?? "",
      chapters: [],
    };
    studies.set(url[1], study);
    const orientation = tag(text, "Orientation");
    study.chapters.push({
      chapterId: url[2],
      name: tag(text, "ChapterName") || `Chapter ${study.chapters.length + 1}`,
      orientation: orientation === "black" ? "b" : orientation === "white" ? "w" : null,
      pgn: text,
    });
  }
  return [...studies.values()];
}
