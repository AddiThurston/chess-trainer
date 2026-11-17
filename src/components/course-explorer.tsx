"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { CourseSettings } from "@/components/course-settings";
import { TitleBadge } from "@/components/title-badge";
import { TrainerBoard } from "@/components/trainer-board";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Chapter, Course } from "@/lib/courses";
import { keyToFen, positionKey, type TreeMove } from "@/lib/move-tree";
import { cn } from "@/lib/utils";

const NAG_GLYPHS: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

function glyphs(move: TreeMove) {
  return move.nags.map((nag) => NAG_GLYPHS[nag] ?? "").join("");
}

function startPly(fen: string) {
  const [, turn, , , , fullmove] = fen.split(" ");
  return (Number(fullmove) - 1) * 2 + (turn === "b" ? 1 : 0);
}

function numbered(san: string, ply: number, first: boolean) {
  const number = Math.floor(ply / 2) + 1;
  if (ply % 2 === 0) return `${number}. ${san}`;
  return first ? `${number}… ${san}` : san;
}

export function CourseExplorer({
  course,
  chapters,
  moves,
  canEdit,
  isAdmin,
  needsPermission,
}: {
  course: Course;
  chapters: Chapter[];
  moves: TreeMove[];
  canEdit: boolean;
  isAdmin: boolean;
  needsPermission: boolean;
}) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [path, setPath] = useState<TreeMove[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const children = useMemo(() => {
    const map = new Map<string, TreeMove[]>();
    for (const move of moves) map.set(move.from, [...(map.get(move.from) ?? []), move]);
    return map;
  }, [moves]);

  const chapter = chapters[chapterIndex];
  const rootKey = positionKey(chapter.startFen);
  const last = path.at(-1);
  const key = last?.to ?? rootKey;
  const fen = keyToFen(key);
  const options = children.get(key) ?? [];
  const firstPly = startPly(chapter.startFen);
  const author = [course.authorTitle, course.authorName].filter(Boolean).join(" ");
  // A merged course can draw on several studies, and each one is credited.
  const studyUrls = [...new Set(chapters.map((item) => item.sourceUrl.replace(/\/[A-Za-z0-9]{8}$/, "")).filter(Boolean))];
  const sources =
    studyUrls.length > 1
      ? studyUrls.map((url) => ({ url, name: "" }))
      : course.sourceUrl || course.sourceName
        ? [{ url: course.sourceUrl, name: course.sourceName }]
        : [];
  const manyStarts = new Set(chapters.map((item) => positionKey(item.startFen))).size > 1;

  function play(move: TreeMove) {
    setPath((current) => [...current, move]);
    setStatus(null);
  }

  function onMove(attempt: { from: string; to: string; promotion?: string }) {
    const uci = `${attempt.from}${attempt.to}${attempt.promotion ?? ""}`;
    const move = options.find((option) => option.uci === uci);
    if (!move) {
      setStatus("That move is not in this course.");
      return false;
    }
    play(move);
    return true;
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,640px)_minmax(280px,1fr)] lg:px-8">
      <TrainerBoard
        fen={fen}
        orientation={course.color === "b" ? "black" : "white"}
        playerColor={key.split(" ")[1] === "b" ? "b" : "w"}
        interactive={options.length > 0}
        lastMove={last ? { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } : null}
        boardId={`course-${course.id}`}
        onMove={onMove}
      />
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-heading text-3xl leading-tight font-extrabold">{course.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            For {course.color === "b" ? "Black" : "White"}, {course.lineCount} {course.lineCount === 1 ? "line" : "lines"},{" "}
            {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}, {course.visibility}
          </p>
          {course.description ? <p className="mt-3">{course.description}</p> : null}
        </div>

        {author || sources.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-card p-4 text-sm">
            {author ? (
              <>
                <dt className="text-muted-foreground">Author</dt>
                <dd className="flex items-center gap-1.5">
                  <TitleBadge title={course.authorTitle} />
                  {course.authorUrl ? (
                    <a href={course.authorUrl} className="underline underline-offset-4" rel="noreferrer" target="_blank">
                      {course.authorName}
                    </a>
                  ) : (
                    course.authorName
                  )}
                </dd>
              </>
            ) : null}
            {sources.length ? (
              <>
                <dt className="text-muted-foreground">{sources.length === 1 ? "Source" : "Sources"}</dt>
                <dd className="flex min-w-0 flex-col">
                  {sources.map((source) =>
                    source.url ? (
                      <a key={source.url} href={source.url} className="truncate underline underline-offset-4" rel="noreferrer" target="_blank">
                        {source.name || source.url}
                      </a>
                    ) : (
                      <span key={source.name}>{source.name}</span>
                    ),
                  )}
                </dd>
              </>
            ) : null}
            {course.importedAt ? (
              <>
                <dt className="text-muted-foreground">Imported</dt>
                <dd>{course.importedAt}</dd>
              </>
            ) : null}
          </dl>
        ) : null}

        {manyStarts ? (
          <label className="flex flex-col gap-1 text-sm">
            Chapter
            <select
              className="min-h-11 rounded-lg border border-input bg-background px-3"
              value={chapterIndex}
              onChange={(event) => {
                setChapterIndex(Number(event.target.value));
                setPath([]);
                setStatus(null);
              }}
            >
              {chapters.map((item, index) => (
                <option key={index} value={index}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex min-h-11 flex-wrap items-center gap-1">
            {path.length === 0 ? (
              <p className="text-muted-foreground">Play a move on the board, or pick one below.</p>
            ) : (
              path.map((move, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPath(path.slice(0, index + 1))}
                  className={cn(
                    "rounded-md px-1.5 py-1 font-semibold hover:bg-muted",
                    index === path.length - 1 && "bg-muted text-primary",
                  )}
                >
                  {numbered(`${move.san}${glyphs(move)}`, firstPly + index, index === 0)}
                </button>
              ))
            )}
          </div>

          {last?.comment || (!last && chapter.intro) ? (
            <figure className="rounded-xl border-l-4 border-due bg-card p-4">
              <figcaption className="text-sm text-muted-foreground">{author ? `${author}'s note` : "Author's note"}</figcaption>
              <blockquote className="mt-1 whitespace-pre-line">{last ? last.comment : chapter.intro}</blockquote>
            </figure>
          ) : null}

          {options.length ? (
            <div className="flex flex-wrap gap-2">
              {options.map((move) => (
                <Button
                  key={move.san}
                  variant="secondary"
                  className="h-11 px-4 text-base font-semibold"
                  onClick={() => play(move)}
                >
                  {numbered(`${move.san}${glyphs(move)}`, firstPly + path.length, true)}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">This line ends here.</p>
          )}
          {status ? <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm">{status}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11 px-4" disabled={!path.length} onClick={() => setPath(path.slice(0, -1))}>
              Back one move
            </Button>
            <Button variant="outline" className="h-11 px-4" disabled={!path.length} onClick={() => setPath([])}>
              Start over
            </Button>
            <a href={`/api/courses/${course.id}/pgn`} className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
              <Download />
              Export PGN
            </a>
          </div>
        </div>

        {canEdit ? <CourseSettings course={course} isAdmin={isAdmin} needsPermission={needsPermission} /> : null}
      </div>
    </div>
  );
}
