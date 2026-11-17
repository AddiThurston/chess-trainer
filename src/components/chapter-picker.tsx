"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TitleBadge } from "@/components/title-badge";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/sign-in-form";
import type { ChapterListing } from "@/lib/imports";

export function ChapterPicker({ chapters }: { chapters: ChapterListing[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("");
  const [unassigned, setUnassigned] = useState(false);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return chapters.filter(
      (chapter) =>
        (!color || chapter.color === color) &&
        (!unassigned || chapter.courseId === null) &&
        (!needle ||
          `${chapter.author} ${chapter.studyName} ${chapter.name} ${chapter.opening} ${chapter.eco}`.toLowerCase().includes(needle)),
    );
  }, [chapters, search, color, unassigned]);

  const studies = useMemo(() => {
    const groups = new Map<string, ChapterListing[]>();
    for (const chapter of shown) groups.set(chapter.studyId, [...(groups.get(chapter.studyId) ?? []), chapter]);
    return [...groups.values()];
  }, [shown]);

  function toggle(ids: number[], on: boolean) {
    const next = new Set(ticked);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setTicked(next);
  }

  async function create(mode: "merge" | "split") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: [...ticked], mode, title }),
      });
      const data = (await response.json()) as { ok: boolean; ids?: number[]; message?: string };
      if (!data.ok) {
        setMessage(data.message ?? "The courses could not be made.");
        return;
      }
      setMessage(`Made ${data.ids?.length} ${data.ids?.length === 1 ? "course" : "courses"}. They are private.`);
      setTicked(new Set());
      setTitle("");
      router.refresh();
    } catch {
      setMessage("The server did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!chapters.length) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl font-extrabold">Chapters</h1>
        <p className="mt-3 text-muted-foreground">
          No studies have been fetched yet. Start an import, and the chapters it finds will be listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-40">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Chapters</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Tick the chapters to train. Merge them into one course when they cover the same repertoire, or make one
          course per chapter. Ticking chapters that are already in a course moves them out of it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search author, study, chapter, or opening"
          aria-label="Search chapters"
          className={fieldClass}
        />
        <select value={color} onChange={(event) => setColor(event.target.value)} aria-label="Side" className={fieldClass}>
          <option value="">Both sides</option>
          <option value="w">For White</option>
          <option value="b">For Black</option>
        </select>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="size-5 accent-primary" checked={unassigned} onChange={(event) => setUnassigned(event.target.checked)} />
          Not in a course yet
        </label>
      </div>

      {studies.map((group) => {
        const ids = group.map((chapter) => chapter.id);
        const all = ids.every((id) => ticked.has(id));
        return (
          <section key={group[0].studyId} className="rounded-xl bg-card">
            <label className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-2">
              <input type="checkbox" className="size-5 accent-primary" checked={all} onChange={(event) => toggle(ids, event.target.checked)} />
              <span className="font-heading text-lg font-bold">{group[0].studyName}</span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TitleBadge title={group[0].authorTitle} />
                {group[0].author}
              </span>
            </label>
            <ul className="divide-y divide-border/60">
              {group.map((chapter) => (
                <li key={chapter.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 px-4 py-2 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,2fr)_5rem_minmax(0,1.5fr)]">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    aria-label={`Tick ${chapter.name}`}
                    checked={ticked.has(chapter.id)}
                    onChange={(event) => toggle([chapter.id], event.target.checked)}
                  />
                  <span className="truncate font-semibold">{chapter.name}</span>
                  <span className="col-start-2 truncate text-sm text-muted-foreground sm:col-start-auto">
                    {chapter.opening ? `${chapter.eco} ${chapter.opening}` : "Not a named opening"}
                  </span>
                  <span className="col-start-2 text-sm sm:col-start-auto">{chapter.color === "b" ? "Black" : "White"}</span>
                  <span className="col-start-2 truncate text-sm sm:col-start-auto">
                    {chapter.courseId ? (
                      <Link href={`/courses/${chapter.courseId}`} className="text-primary underline-offset-4 hover:underline">
                        {chapter.courseTitle}
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {shown.length ? null : <p className="text-muted-foreground">No chapters match those filters.</p>}

      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-popover px-4 py-3 lg:bottom-0 lg:left-56">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <span className="font-semibold">{ticked.size} ticked</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title for a merged course"
            aria-label="Title for a merged course"
            className={`${fieldClass} max-w-xs flex-1`}
          />
          <Button className="h-11 px-4" disabled={busy || !ticked.size || !title.trim()} onClick={() => create("merge")}>
            Merge into one course
          </Button>
          <Button variant="secondary" className="h-11 px-4" disabled={busy || !ticked.size} onClick={() => create("split")}>
            One course per chapter
          </Button>
          {message ? <span className="w-full text-sm">{message}</span> : null}
        </div>
      </div>
    </div>
  );
}
