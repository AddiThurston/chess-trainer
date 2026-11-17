import type { PoolClient } from "pg";
import { query, transaction } from "@/lib/db";
import { writeTree } from "@/lib/courses";
import { guessColor, parsePgn } from "@/lib/move-tree";
import { openingFamily } from "@/lib/openings";

type ChapterRow = {
  id: number;
  studyId: string;
  studyName: string;
  name: string;
  opening: string;
  color: "w" | "b";
  pgn: string;
  courseId: number | null;
  author: string;
};

const CHAPTERS = `select study_chapters.id, study_id as "studyId", lichess_studies.name as "studyName",
    study_chapters.name, opening, color, pgn, course_id as "courseId", lichess_studies.author
  from study_chapters join lichess_studies on lichess_studies.id = study_chapters.study_id`;

function majorityColor(rows: ChapterRow[]) {
  return rows.filter((row) => row.color === "b").length * 2 > rows.length ? "b" : "w";
}

/** Rebuilds a course from the chapters still assigned to it, or deletes it when none are left. */
export async function rebuildCourse(client: PoolClient, courseId: number) {
  const { rows } = await client.query<ChapterRow>(
    `${CHAPTERS} where course_id = $1 order by study_id, study_chapters.ord`,
    [courseId],
  );
  if (!rows.length) {
    await client.query("delete from courses where id = $1", [courseId]);
    return;
  }
  const parsed = parsePgn(rows.map((row) => row.pgn).join("\n\n"));
  if (parsed.moves.length) await writeTree(client, courseId, parsed);
}

async function createCourse(client: PoolClient, rows: ChapterRow[], title: string, ownerId: number) {
  const parsed = parsePgn(rows.map((row) => row.pgn).join("\n\n"));
  if (!parsed.moves.length) return null;
  const studies = [...new Map(rows.map((row) => [row.studyId, row.studyName])).entries()];
  const families = [...new Set(rows.map((row) => openingFamily(row.opening)).filter(Boolean))];
  const created = await client.query<{ id: number }>(
    `insert into courses (title, description, color, kind, owner_id, author_username, author_name, author_title,
       author_url, source_name, source_url, imported_at, permission_granted, permission_note, thumb_key)
     select $1, $2, $3, 'lichess_study', $4, username, name, title, 'https://lichess.org/@/' || name, $5, $6, now(),
       permission_granted, permission_note, ''
     from lichess_authors where username = $7
     returning id`,
    [
      title,
      families.join(", "),
      guessColor(parsed.moves, majorityColor(rows)),
      ownerId,
      studies.map(([, name]) => name).join(", "),
      `https://lichess.org/study/${studies[0][0]}`,
      rows[0].author,
    ],
  );
  const courseId = created.rows[0].id;
  await client.query("update study_chapters set course_id = $1 where id = any($2)", [
    courseId,
    rows.map((row) => row.id),
  ]);
  await writeTree(client, courseId, parsed);
  return courseId;
}

/**
 * Turns ticked chapters into one merged course or one course each. Chapters that already belonged to a course
 * move out of it, which is how a merged course is split.
 */
export async function coursesFromChapters(chapterIds: number[], mode: "merge" | "split", title: string, ownerId: number) {
  const rows = await query<ChapterRow>(`${CHAPTERS} where study_chapters.id = any($1) order by study_id, study_chapters.ord`, [
    chapterIds,
  ]);
  if (!rows.length) return { error: "Tick at least one chapter.", ids: [] };
  if (mode === "merge" && new Set(rows.map((row) => row.author)).size > 1) {
    return { error: "A course has one author. Tick chapters from a single author to merge them.", ids: [] };
  }
  if (mode === "merge" && !title) return { error: "Give the merged course a title.", ids: [] };

  const groups = mode === "merge" ? [rows] : rows.map((row) => [row]);
  const ids = await transaction(async (client) => {
    const created: number[] = [];
    for (const group of groups) {
      const name = mode === "merge" ? title : `${group[0].studyName}: ${group[0].name}`;
      const id = await createCourse(client, group, name, ownerId);
      if (id) created.push(id);
    }
    const emptied = new Set(rows.map((row) => row.courseId).filter((id): id is number => id !== null));
    for (const courseId of emptied) await rebuildCourse(client, courseId);
    return created;
  });
  return { error: ids.length ? null : "Those chapters have no moves to train.", ids };
}
