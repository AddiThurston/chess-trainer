import { query, transaction } from "@/lib/db";
import { DEFAULT_TITLES, parseInputs } from "@/lib/lichess-inputs";

export type ImportTask = {
  id: number;
  kind: "titles" | "user" | "study";
  target: string;
  status: "queued" | "running" | "done" | "skipped" | "failed";
  detail: string;
};

export type ImportJob = { id: number; createdAt: string; allowlist: string[]; total: number; open: number };

export type ChapterListing = {
  id: number;
  name: string;
  eco: string;
  opening: string;
  color: "w" | "b";
  studyId: string;
  studyName: string;
  author: string;
  authorTitle: string;
  courseId: number | null;
  courseTitle: string | null;
};

export type AuthorListing = {
  username: string;
  name: string;
  title: string;
  permissionGranted: boolean;
  permissionNote: string;
  studies: number;
  courses: number;
};

type NewTask = { kind: ImportTask["kind"]; target: string };

async function createJob(tasks: NewTask[], allowlist: string[], fresh: boolean, userId: number) {
  return transaction(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      "insert into import_jobs (created_by, allowlist) values ($1, $2) returning id",
      [userId, allowlist],
    );
    await client.query(
      `insert into import_tasks (job_id, kind, target, fresh)
       select $1, item.kind, item.target, $3 from jsonb_to_recordset($2::jsonb) as item(kind text, target text)`,
      [rows[0].id, JSON.stringify(tasks), fresh],
    );
    return rows[0].id;
  });
}

export async function startImport(text: string, allowlist: string[], userId: number) {
  const { users, studies, unknown } = parseInputs(text);
  if (!users.length && !studies.length) return { id: null, unknown };
  const tasks: NewTask[] = [
    ...(users.length ? [{ kind: "titles" as const, target: users.join(",") }] : []),
    ...users.map((target) => ({ kind: "user" as const, target })),
    ...studies.map((target) => ({ kind: "study" as const, target })),
  ];
  return { id: await createJob(tasks, allowlist.length ? allowlist : DEFAULT_TITLES, false, userId), unknown };
}

// A re-sync keeps whoever is already imported: the allowlist is their current title, checked again by the task.
export async function resyncAuthor(username: string, userId: number) {
  const rows = await query<{ title: string }>("select title from lichess_authors where username = $1", [username]);
  if (!rows[0]) return null;
  return createJob(
    [
      { kind: "titles", target: username },
      { kind: "user", target: username },
    ],
    [rows[0].title],
    true,
    userId,
  );
}

export async function resyncCourse(courseId: number, userId: number) {
  const rows = await query<{ studyId: string; title: string }>(
    `select distinct study_id as "studyId", lichess_authors.title
     from study_chapters
     join lichess_studies on lichess_studies.id = study_id
     join lichess_authors on lichess_authors.username = lichess_studies.author
     where course_id = $1`,
    [courseId],
  );
  if (!rows.length) return null;
  return createJob(
    rows.map((row) => ({ kind: "study" as const, target: row.studyId })),
    [rows[0].title],
    true,
    userId,
  );
}

export async function listJobs() {
  return query<ImportJob>(
    `select import_jobs.id, to_char(created_at, 'YYYY-MM-DD HH24:MI') as "createdAt", allowlist,
       count(import_tasks.id)::int as total,
       count(import_tasks.id) filter (where status in ('queued', 'running'))::int as open
     from import_jobs left join import_tasks on job_id = import_jobs.id
     group by import_jobs.id order by import_jobs.id desc limit 20`,
  );
}

export async function getJob(id: number) {
  const jobs = await query<{ id: number; allowlist: string[] }>("select id, allowlist from import_jobs where id = $1", [id]);
  if (!jobs[0]) return null;
  const tasks = await query<ImportTask>(
    "select id, kind, target, status, detail from import_tasks where job_id = $1 order by id",
    [id],
  );
  return { ...jobs[0], tasks };
}

export async function listChapters() {
  return query<ChapterListing>(
    `select study_chapters.id, study_chapters.name, eco, opening, study_chapters.color, study_id as "studyId",
       lichess_studies.name as "studyName", lichess_authors.name as author, lichess_authors.title as "authorTitle",
       course_id as "courseId", courses.title as "courseTitle"
     from study_chapters
     join lichess_studies on lichess_studies.id = study_id
     join lichess_authors on lichess_authors.username = lichess_studies.author
     left join courses on courses.id = course_id
     order by lichess_authors.name, lichess_studies.name, study_id, study_chapters.ord`,
  );
}

export async function listAuthors() {
  return query<AuthorListing>(
    `select username, name, title, permission_granted as "permissionGranted", permission_note as "permissionNote",
       (select count(*)::int from lichess_studies where author = username) as studies,
       (select count(*)::int from courses where author_username = username) as courses
     from lichess_authors
     where exists (select 1 from lichess_studies where author = username)
     order by name`,
  );
}

/** Returns an error message, or null when saved. The author's courses follow the author's permission. */
export async function setAuthorPermission(username: string, granted: boolean, note: string) {
  if (granted && !note.trim()) return "Add a note saying when and how the author agreed.";
  await transaction(async (client) => {
    await client.query("update lichess_authors set permission_granted = $2, permission_note = $3 where username = $1", [
      username,
      granted,
      note,
    ]);
    await client.query(
      `update courses set permission_granted = $2, permission_note = $3,
         visibility = case when $2 then visibility else 'private' end
       where author_username = $1`,
      [username, granted, note],
    );
  });
  return null;
}
