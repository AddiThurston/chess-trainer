import { createHash } from "node:crypto";
import { query, transaction } from "@/lib/db";
import {
  fetchStudyPgn,
  fetchUserPgn,
  fetchUsers,
  forgetUserPgn,
  LichessError,
  splitStudies,
  type FetchedStudy,
} from "@/lib/lichess";
import { guessColor, parsePgn } from "@/lib/move-tree";
import { classifyOpening } from "@/lib/openings";
import { rebuildCourse } from "@/lib/study-courses";

export type Task = { id: number; kind: "titles" | "user" | "study"; target: string; fresh: boolean; allowlist: string[] };
type Outcome = { status: "done" | "skipped" | "failed"; detail: string };
type Author = { username: string; title: string };

// Export timestamps are left out of the hash so a study only counts as changed when its content did.
function contentHash(study: FetchedStudy) {
  const text = study.chapters.map((chapter) => chapter.pgn.replace(/^\[(UTCDate|UTCTime|Date) .*\]\n/gm, "")).join("\n\n");
  return createHash("sha256").update(text).digest("hex");
}

async function saveStudy(study: FetchedStudy, author: string): Promise<"new" | "changed" | "unchanged"> {
  const hash = contentHash(study);
  const known = await query<{ hash: string }>(`select content_hash as hash from lichess_studies where id = $1`, [study.id]);
  if (known[0]?.hash === hash) return "unchanged";

  const chapters = study.chapters.map((chapter, ord) => {
    const parsed = parsePgn(chapter.pgn);
    const opening = classifyOpening(parsed.moves, parsed.chapters[0]?.startFen ?? "");
    return {
      chapterId: chapter.chapterId,
      ord,
      name: chapter.name,
      eco: opening.eco,
      opening: opening.name,
      color: guessColor(parsed.moves, chapter.orientation ?? "w"),
      pgn: chapter.pgn,
    };
  });

  await transaction(async (client) => {
    // Read before the delete below, so a course whose only chapter was removed upstream is still rebuilt.
    const courses = await client.query<{ id: number }>(
      "select distinct course_id as id from study_chapters where study_id = $1 and course_id is not null",
      [study.id],
    );
    await client.query(
      `insert into lichess_studies (id, author, name, content_hash) values ($1, $2, $3, $4)
       on conflict (id) do update set name = excluded.name, content_hash = excluded.content_hash, fetched_at = now()`,
      [study.id, author, study.name || study.id, hash],
    );
    await client.query("delete from study_chapters where study_id = $1 and chapter_id <> all($2)", [
      study.id,
      chapters.map((chapter) => chapter.chapterId),
    ]);
    await client.query(
      `insert into study_chapters (study_id, chapter_id, ord, name, eco, opening, color, pgn)
       select $1, item."chapterId", item.ord, item.name, item.eco, item.opening, item.color, item.pgn
       from jsonb_to_recordset($2::jsonb) as item("chapterId" text, ord integer, name text, eco text, opening text,
         color text, pgn text)
       on conflict (study_id, chapter_id) do update set ord = excluded.ord, name = excluded.name, eco = excluded.eco,
         opening = excluded.opening, color = excluded.color, pgn = excluded.pgn`,
      [study.id, JSON.stringify(chapters)],
    );
    for (const course of courses.rows) await rebuildCourse(client, course.id);
  });
  return known.length ? "changed" : "new";
}

async function saveAuthors(usernames: string[], onWait: () => Promise<void>) {
  const users = await fetchUsers(usernames, onWait);
  for (const user of users.filter((item) => !item.disabled)) {
    await query(
      `insert into lichess_authors (username, name, title) values ($1, $2, $3)
       on conflict (username) do update set name = excluded.name, title = excluded.title, title_checked_at = now()`,
      [user.id, user.username, user.title ?? ""],
    );
  }
  return users.length;
}

async function allowedAuthor(username: string, allowlist: string[]): Promise<Author | string> {
  const rows = await query<Author>("select username, title from lichess_authors where username = $1", [
    username.toLowerCase(),
  ]);
  if (!rows[0]) return `No open Lichess account is named ${username}.`;
  if (!allowlist.includes(rows[0].title)) {
    return `${rows[0].title ? `Their title is ${rows[0].title}` : "They have no title"}, and the allowlist is ${allowlist.join(", ")}.`;
  }
  return rows[0];
}

function tally(results: string[]) {
  const count = (name: string) => results.filter((result) => result === name).length;
  return `${results.length} ${results.length === 1 ? "study" : "studies"}: ${count("new")} new, ${count("changed")} changed, ${count("unchanged")} unchanged.`;
}

async function run(task: Task, onWait: () => Promise<void>): Promise<Outcome> {
  if (task.kind === "titles") {
    const usernames = task.target.split(",");
    const found = await saveAuthors(usernames, onWait);
    return { status: "done", detail: `Looked up ${usernames.length} ${usernames.length === 1 ? "name" : "names"}, found ${found}.` };
  }

  if (task.kind === "user") {
    const author = await allowedAuthor(task.target, task.allowlist);
    if (typeof author === "string") return { status: "skipped", detail: author };
    const studies = splitStudies(await fetchUserPgn(author.username, task.fresh, onWait));
    const results: string[] = [];
    for (const study of studies) results.push(await saveStudy(study, author.username));
    return { status: "done", detail: tally(results) };
  }

  const [study] = splitStudies(await fetchStudyPgn(task.target, task.fresh, onWait));
  if (!study) return { status: "failed", detail: "The export had no chapters." };
  if (!study.author) return { status: "skipped", detail: "The export does not name an author, so the title cannot be checked." };
  const known = await query("select 1 from lichess_authors where username = $1", [study.author.toLowerCase()]);
  if (!known.length || task.fresh) await saveAuthors([study.author], onWait);
  const author = await allowedAuthor(study.author, task.allowlist);
  if (typeof author === "string") return { status: "skipped", detail: `Author ${study.author}: ${author}` };
  await forgetUserPgn(author.username);
  return { status: "done", detail: `${study.name} by ${study.author}: ${await saveStudy(study, author.username)}.` };
}

export async function runTask(task: Task) {
  const onWait = async () => {
    await query("update import_tasks set detail = $2 where id = $1", [
      task.id,
      "Lichess asked for fewer requests. Waiting a minute before trying again.",
    ]);
  };
  let outcome: Outcome;
  try {
    outcome = await run(task, onWait);
  } catch (error) {
    if (!(error instanceof LichessError)) console.error(error);
    outcome = { status: "failed", detail: error instanceof Error ? error.message : "The task failed." };
  }
  await query("update import_tasks set status = $2, detail = $3, finished_at = now() where id = $1", [
    task.id,
    outcome.status,
    outcome.detail,
  ]);
}
