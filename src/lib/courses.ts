import type { PoolClient } from "pg";
import { query, transaction } from "@/lib/db";
import type { User } from "@/lib/auth";
import { countLines, guessColor, keyPosition, parsePgn, positionKey, type ParsedPgn, type TreeMove } from "@/lib/move-tree";

export type CourseKind = "pgn" | "lichess_study" | "master_games" | "created";

export type Course = {
  id: number;
  title: string;
  description: string;
  color: "w" | "b";
  kind: CourseKind;
  ownerId: number | null;
  visibility: "private" | "public";
  authorName: string;
  authorTitle: string;
  authorUrl: string;
  sourceName: string;
  sourceUrl: string;
  importedAt: string | null;
  permissionGranted: boolean;
  permissionNote: string;
  lineCount: number;
  thumbKey: string;
  authorUsername: string | null;
};

export type Chapter = { name: string; startFen: string; intro: string; sourceUrl: string };

export type CourseInput = {
  title: string;
  description?: string;
  color?: "w" | "b";
  authorName?: string;
  authorTitle?: string;
  authorUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  pgn: string;
};

const COLUMNS = `id, title, description, color, kind, owner_id as "ownerId", visibility,
  author_name as "authorName", author_title as "authorTitle", author_url as "authorUrl",
  source_name as "sourceName", source_url as "sourceUrl", to_char(imported_at, 'YYYY-MM-DD') as "importedAt",
  permission_granted as "permissionGranted", permission_note as "permissionNote",
  line_count as "lineCount", thumb_key as "thumbKey", author_username as "authorUsername"`;

// Text someone else wrote stays private until its author has agreed to it being shown.
export function needsPermission(kind: CourseKind) {
  return kind === "pgn" || kind === "lichess_study";
}

function canSee(course: Course, user: User | null) {
  return course.visibility === "public" || Boolean(user && (user.isAdmin || user.id === course.ownerId));
}

export function canEdit(course: Course, user: User | null) {
  return Boolean(user && (user.isAdmin || user.id === course.ownerId));
}

export async function listCourses(user: User | null) {
  return query<Course>(
    `select ${COLUMNS} from courses
     where visibility = 'public' or owner_id = $1 or $2
     order by created_at desc`,
    [user?.id ?? null, user?.isAdmin ?? false],
  );
}

export async function getCourse(id: number, user: User | null) {
  const rows = await query<Course>(`select ${COLUMNS} from courses where id = $1`, [id]);
  return rows[0] && canSee(rows[0], user) ? rows[0] : null;
}

export async function getChapters(courseId: number) {
  return query<Chapter>(
    `select name, start_fen as "startFen", intro, source_url as "sourceUrl" from course_chapters where course_id = $1 order by ord`,
    [courseId],
  );
}

export async function getMoves(courseId: number) {
  return query<TreeMove>(
    `select from_key as "from", san, uci, to_key as "to", comment, nags, shapes, ord
     from course_moves where course_id = $1 order by ord`,
    [courseId],
  );
}

/** Replaces a course's chapters and moves with a parsed PGN and refreshes the numbers derived from them. */
export async function writeTree(client: PoolClient, courseId: number, parsed: ParsedPgn) {
  const roots = parsed.chapters.map((chapter) => positionKey(chapter.startFen));
  await client.query("delete from course_chapters where course_id = $1", [courseId]);
  await client.query("delete from course_moves where course_id = $1", [courseId]);
  await client.query(
    `insert into course_chapters (course_id, ord, name, start_fen, intro, source_url, pgn)
     select $1, item.ord, item.name, item."startFen", item.intro, item."sourceUrl", item.pgn
     from jsonb_to_recordset($2::jsonb) as item(ord integer, name text, "startFen" text, intro text,
       "sourceUrl" text, pgn text)`,
    [courseId, JSON.stringify(parsed.chapters.map((chapter, ord) => ({ ...chapter, ord })))],
  );
  await client.query(
    `insert into course_moves (course_id, from_key, san, uci, to_key, comment, nags, shapes, ord)
     select $1, item."from", item.san, item.uci, item."to", item.comment, item.nags, item.shapes, item.ord
     from jsonb_to_recordset($2::jsonb) as item("from" text, san text, uci text, "to" text, comment text,
       nags integer[], shapes text, ord integer)`,
    [courseId, JSON.stringify(parsed.moves)],
  );
  await client.query("update courses set line_count = $2, thumb_key = $3, updated_at = now() where id = $1", [
    courseId,
    countLines(parsed.moves, roots),
    keyPosition(parsed.moves, roots[0]),
  ]);
}

export async function importPgnCourse(input: CourseInput, owner: User) {
  const parsed = parsePgn(input.pgn);
  if (!parsed.chapters.length || !parsed.moves.length) return { id: null, warnings: parsed.warnings };

  const id = await transaction(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      `insert into courses (title, description, color, kind, owner_id, author_name, author_title, author_url,
         source_name, source_url, imported_at, thumb_key)
       values ($1, $2, $3, 'pgn', $4, $5, $6, $7, $8, $9, now(), '')
       returning id`,
      [
        input.title,
        input.description ?? "",
        input.color ?? guessColor(parsed.moves),
        owner.id,
        input.authorName ?? "",
        input.authorTitle ?? "",
        input.authorUrl ?? "",
        input.sourceName ?? "",
        input.sourceUrl ?? "",
      ],
    );
    await writeTree(client, rows[0].id, parsed);
    return rows[0].id;
  });
  return { id, warnings: parsed.warnings };
}

export type CourseChanges = {
  title?: string;
  description?: string;
  color?: "w" | "b";
  visibility?: "private" | "public";
  permissionGranted?: boolean;
  permissionNote?: string;
};

/** Returns an error message, or null when the change was saved. */
export async function updateCourse(course: Course, changes: CourseChanges) {
  const next = { ...course, ...changes };
  if (!next.title.trim()) return "A course needs a title.";
  if (next.permissionGranted && !next.permissionNote.trim()) {
    return "Add a note saying when and how the author agreed.";
  }
  if (next.visibility === "public" && needsPermission(next.kind) && !next.permissionGranted) {
    return "This course cannot be public until the author's permission is recorded.";
  }
  await query(
    `update courses set title = $2, description = $3, color = $4, visibility = $5, permission_granted = $6,
       permission_note = $7, updated_at = now()
     where id = $1`,
    [course.id, next.title.trim(), next.description, next.color, next.visibility, next.permissionGranted, next.permissionNote],
  );
  return null;
}

export async function deleteCourse(id: number) {
  await query("delete from courses where id = $1", [id]);
}
