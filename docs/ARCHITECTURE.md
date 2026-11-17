# Architecture

Tabiya is the opening-course side of the chess trainer. This document covers the data model, the API routes, the pages, and the build order. Sections marked "built" exist in the code; the rest is the plan for the milestone named beside it.

## Stack

The app stays on what the repo already uses: Next.js 16 (App Router, standalone output), React 19, TypeScript, Tailwind 4, chess.js, react-chessboard, and Stockfish. The additions are Postgres through `pg` with plain SQL, `@mliebelt/pgn-parser` for PGN with variations, and one worker process for the import queue. The worker runs the app's TypeScript directly with Node's type stripping; `scripts/alias.mjs` resolves the `@/` import paths for it. There is no ORM. Migrations are an ordered array of SQL strings in `src/lib/schema.ts`, applied on the first query under an advisory lock so the app and the worker can start together.

API routes follow the existing engine route: JSON bodies, and failures as `{ ok: false, code, message }` with a matching status.

## Data model

### Move tree (built)

A course is a graph of positions, not a list of lines. Each row of `course_moves` is one edge:

| Column | Meaning |
| --- | --- |
| `course_id`, `from_key`, `san` | Primary key. One row per move per position per course. |
| `to_key` | The position the move leads to. |
| `uci` | For matching a move played on the board. |
| `comment`, `nags`, `shapes` | The author's annotation: text, NAG numbers, and `[%cal]`/`[%csl]` arrows and squares. |
| `ord` | Order among the moves from that position. `0` is the main move. |

A position key is the first four FEN fields (pieces, side to move, castling, en passant). Move counters are dropped, so two move orders that reach the same position share one node and everything below it. chess.js only writes an en passant square when the capture is legal, which keeps keys from splitting on a meaningless field.

Consequences worth knowing:

- Annotations belong to a move in a position, not to a line. If two chapters annotate the same move, both notes are kept, joined.
- A line is a root-to-leaf path. `line_count` is the number of such paths, and a repeated position ends its line.
- Training accepts any course move from a position, which is the same rule as the multi-solution puzzle fix.

### Courses and chapters (built)

`courses` holds the title, description, color (`w` or `b`), kind, owner, visibility, attribution, `line_count`, and `thumb_key` (the position where the tree first branches, used for the card thumbnail).

`kind` is one of `pgn` (uploaded file), `lichess_study` (bulk import), `master_games` (built from the explorer), or `created` (made in the course creator).

`course_chapters` keeps each source chapter's name, full start FEN, intro comment, and its original PGN text. The tree is what you train on. The stored chapter PGN is the untouched source, and it is what makes merging and splitting cheap: a merged or split course is a tree rebuilt from a chosen set of chapters.

PGN export walks the tree and writes one game per distinct start position, with the first move from each position as the main line and the others as variations. A position reached a second time is not expanded again.

### Sources and attribution

Built: `courses` stores `author_name`, `author_title`, `author_url`, `source_name`, `source_url`, `imported_at`, `permission_granted`, and `permission_note`. The course page shows all of them, and notes are labeled as the author's.

Visibility rule (built): a course of kind `pgn` or `lichess_study` cannot be public unless `permission_granted` is true, and the flag cannot be set without a note. Only the admin can set the flag. Clearing it makes the course private again. `master_games` and `created` courses are not gated.

Built in milestone 2:

- `lichess_authors (username, name, title, permission_granted, permission_note, title_checked_at)`. Permission is recorded per author, because that is who agrees, and setting it copies onto all of that author's courses. Taking it back makes their courses private again. A course's own sharing panel still works for PGN uploads.
- `lichess_studies (id, author, name, content_hash, fetched_at)`. The hash is SHA-256 of the study's chapters with the `Date`, `UTCDate`, and `UTCTime` tags removed, since Lichess stamps those at export time. An unchanged hash means the study is left alone.
- `study_chapters (study_id, chapter_id, ord, name, eco, opening, color, pgn, course_id)`. The staging table behind the chapter picker. Each chapter keeps its raw PGN, so a course is always rebuilt from its chapters: merging, splitting, moving a chapter between courses, and an upstream change all go through the same rebuild.

Opening names come from the CC0 `lichess-org/chess-openings` dataset, vendored in `data/openings`. Each named line is keyed by the position it reaches, and a chapter gets the deepest named position on its main line, so a transposition gets the name of the position rather than the move order. The side a chapter is written for is the side that branches less; Lichess's `Orientation` tag breaks a tie.

### Import jobs (built)

- `import_jobs (id, created_by, allowlist, created_at)`
- `import_tasks (id, job_id, kind, target, fresh, status, detail, finished_at)`, where `kind` is `titles`, `user`, or `study`, and `status` is `queued`, `running`, `done`, `skipped`, or `failed`.

A job is one `titles` task for all pasted usernames (one `POST /api/users`, batched at 300), then one task per username and per study ID. The worker is one loop that claims the oldest queued task, so there is never more than one Lichess request in flight, with a one-second pause between tasks. A 429 waits 65 seconds and retries, up to five times, and the task shows that it is waiting. Every request sends `User-Agent: Tabiya opening trainer (CONTACT_URL)`. Raw PGN responses are written to the `lichess-cache` volume and reused for 24 hours; a re-sync (`fresh`) always refetches, and a study fetched on its own drops its author's cached export so the older export cannot roll it back.

A study passed by ID is checked against the allowlist through its `Annotator` tag. A re-sync passes the author's current title as the allowlist, so it keeps working if you narrow the default list later.

Lichess endpoints, checked against the official OpenAPI spec (`lichess-org/api`) in November 2026:

| Purpose | Endpoint |
| --- | --- |
| One study as PGN | `GET /api/study/{studyId}.pgn?orientation=true` |
| All public studies of a user as PGN | `GET /api/study/by/{username}/export.pgn?orientation=true` |
| Titles for up to 300 users in one call | `POST /api/users?profile=false`, body `id1,id2,…` as `text/plain` |

Both exports include only public studies when the request is anonymous, which is what this importer wants. Each chapter carries `StudyName`, `ChapterName`, `ChapterURL`, and `Annotator` tags, which is how a per-user export is split back into studies.

### Spaced repetition (milestone 3)

`reviews (user_id, course_id, position_key, due_at, interval_days, ease, reps, lapses, last_missed_at)` with primary key `(user_id, course_id, position_key)`.

A card is a position where the student is to move, not a line. The schedule is SM-2: a miss resets the interval and lowers the ease, a hit multiplies the interval by the ease. SM-2 is chosen over FSRS because it is a dozen lines and needs no parameter fitting; the table has what FSRS would need if that changes.

Each mode is a different query over the same tree: Learn walks unseen positions with notes shown, Drill takes positions with `due_at` in the past, Mistakes takes recent `last_missed_at`, Speed runs due lines on a clock, Random walks a random path, and Realistic opponent picks the opponent's reply from the course's moves weighted by explorer frequency.

### Master repertoire builder (milestone 3)

`explorer_cache (url, body, fetched_at)` caches opening-explorer responses. The builder walks from a start position: on the student's turn it takes the most played move of the chosen player or of the masters database, and on the opponent's turn the top N replies, stopping at a minimum game count or a maximum depth. The result is a `master_games` course with the source and the generation date. The masters database has no rating bands, so a rating-band build has to use the Lichess games database instead. The explorer's current access rules need checking before this is built.

### Accounts and progress

Built: `users (id, username, password_hash, is_admin)` and `sessions (token, user_id, expires_at)`. Passwords are hashed with scrypt. The session is an HTTP-only cookie. The admin is created from `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

Milestone 5 adds sign-up, `daily_activity (user_id, day, reps)` for streaks and the leaderboard, and per-course progress computed from `reviews` (learned, due, mastered).

## API routes

| Route | Methods | Status |
| --- | --- | --- |
| `/api/engine` | GET, POST | existing |
| `/api/auth/session` | GET current user, POST sign in, DELETE sign out | built |
| `/api/courses` | GET list visible courses, POST import a PGN (admin) | built |
| `/api/courses/[id]` | GET course with chapters and moves, PATCH details and sharing, DELETE | built |
| `/api/courses/[id]/pgn` | GET export | built |
| `/api/admin/imports` | POST start a job | built |
| `/api/admin/imports/[id]` | GET progress | built |
| `/api/admin/chapters` | POST merge or split ticked chapters into courses | built |
| `/api/admin/authors/[username]` | PATCH permission, POST re-sync | built |
| `/api/courses/[id]/resync` | POST | built |
| `/api/builder` | POST build from master games | milestone 3 |
| `/api/explorer` | GET cached explorer lookup | milestone 3 |
| `/api/courses/[id]/reviews` | GET due cards, POST a result | milestone 3 |
| `/api/courses/[id]/moves`, `/api/courses/[id]/fork` | edit the tree, fork | milestone 4 |
| `/api/auth/signup`, `/api/leaderboard` | | milestone 5 |

## Pages

| Page | Purpose | Status |
| --- | --- | --- |
| `/` | Landing now; the course grid in milestone 4 | built, changes later |
| `/courses` | Courses you can see | built, becomes the library |
| `/courses/[id]` | Course details, tree explorer, export, sharing | built |
| `/signin` | Sign in | built |
| `/admin/import` | Bulk Lichess import and recent jobs | built |
| `/admin/import/[id]` | Job progress, with skipped authors and reasons | built |
| `/admin/import/pgn` | Single PGN file import | built |
| `/admin/chapters` | Tick, merge, and split chapters into courses | built |
| `/admin/authors` | Imported authors and permission status | built |
| `/courses/[id]/train/[mode]` | Learn, Drill, Mistakes, Speed, Random, Realistic opponent | milestone 3 |
| `/admin/builder` | Master repertoire builder | milestone 3 |
| `/community` | Public courses with search and filters | milestone 4 |
| `/courses/new`, `/courses/[id]/edit` | Course creator | milestone 4 |
| `/analysis` | Free board, engine, PGN, send a line to a course | milestone 4 |
| `/signup`, `/leaderboard` | | milestone 5 |
| `/openings`, `/endgames`, `/tactics`, `/play` | Existing modes | existing |

## Milestones

1. Move tree and PGN import. Done.
2. Bulk Lichess import: worker, queue, title and opening filters, chapter selection, de-duplication, re-sync, authors page. Done.
3. Training modes, the master repertoire builder, and the seed courses.
4. Library, community, course creator, forks, analysis board.
5. Sign-up, progress, streaks, leaderboard.

## Admin pages and access

Every admin page checks the user itself before it queries anything. The admin layout cannot do this alone: Next.js renders a page alongside its layout, so a page's data would still reach a signed-out visitor in the page payload even when the layout shows them a sign-in prompt.
