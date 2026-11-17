/** Applied in order, once each. Append new entries; never edit one that has shipped. */
export const migrations = [
  `
  create table users (
    id serial primary key,
    username text not null unique,
    password_hash text not null,
    is_admin boolean not null default false,
    created_at timestamptz not null default now()
  );

  create table sessions (
    token text primary key,
    user_id integer not null references users (id) on delete cascade,
    expires_at timestamptz not null
  );

  create table courses (
    id serial primary key,
    title text not null,
    description text not null default '',
    color char(1) not null check (color in ('w', 'b')),
    kind text not null check (kind in ('pgn', 'lichess_study', 'master_games', 'created')),
    owner_id integer references users (id) on delete set null,
    visibility text not null default 'private' check (visibility in ('private', 'public')),
    author_name text not null default '',
    author_title text not null default '',
    author_url text not null default '',
    source_name text not null default '',
    source_url text not null default '',
    imported_at timestamptz,
    permission_granted boolean not null default false,
    permission_note text not null default '',
    line_count integer not null default 0,
    thumb_key text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table course_chapters (
    id serial primary key,
    course_id integer not null references courses (id) on delete cascade,
    ord integer not null,
    name text not null,
    start_fen text not null,
    intro text not null default '',
    pgn text
  );

  create table course_moves (
    course_id integer not null references courses (id) on delete cascade,
    from_key text not null,
    san text not null,
    uci text not null,
    to_key text not null,
    comment text not null default '',
    nags integer[] not null default '{}',
    shapes text not null default '',
    ord integer not null,
    primary key (course_id, from_key, san)
  );
  `,
  `
  create table lichess_authors (
    username text primary key,
    name text not null,
    title text not null default '',
    permission_granted boolean not null default false,
    permission_note text not null default '',
    title_checked_at timestamptz not null default now()
  );

  create table lichess_studies (
    id text primary key,
    author text not null references lichess_authors (username),
    name text not null,
    content_hash text not null,
    fetched_at timestamptz not null default now()
  );

  create table study_chapters (
    id serial primary key,
    study_id text not null references lichess_studies (id) on delete cascade,
    chapter_id text not null,
    ord integer not null,
    name text not null,
    eco text not null default '',
    opening text not null default '',
    color char(1) not null check (color in ('w', 'b')),
    pgn text not null,
    course_id integer references courses (id) on delete set null,
    unique (study_id, chapter_id)
  );

  create table import_jobs (
    id serial primary key,
    created_by integer references users (id) on delete set null,
    allowlist text[] not null,
    created_at timestamptz not null default now()
  );

  create table import_tasks (
    id serial primary key,
    job_id integer not null references import_jobs (id) on delete cascade,
    kind text not null check (kind in ('titles', 'user', 'study')),
    target text not null,
    fresh boolean not null default false,
    status text not null default 'queued' check (status in ('queued', 'running', 'done', 'skipped', 'failed')),
    detail text not null default '',
    finished_at timestamptz
  );

  alter table courses add column author_username text references lichess_authors (username);
  alter table course_chapters add column source_url text not null default '';
  `,
];
