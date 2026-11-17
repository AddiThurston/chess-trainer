"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Course } from "@/lib/courses";

export function CourseSettings({
  course,
  isAdmin,
  needsPermission,
}: {
  course: Course;
  isAdmin: boolean;
  needsPermission: boolean;
}) {
  const router = useRouter();
  const [granted, setGranted] = useState(course.permissionGranted);
  const [note, setNote] = useState(course.permissionNote);
  const [isPublic, setIsPublic] = useState(course.visibility === "public");
  const [message, setMessage] = useState<string | null>(null);
  const locked = needsPermission && !granted;

  async function send(method: "PATCH" | "DELETE", body?: object) {
    setMessage(null);
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { ok: boolean; message?: string };
      if (!data.ok) setMessage(data.message ?? "That did not save.");
      return data.ok;
    } catch {
      setMessage("The server did not answer. Try again.");
      return false;
    }
  }

  async function save() {
    const changes = {
      visibility: isPublic && !locked ? "public" : "private",
      ...(needsPermission && isAdmin ? { permissionGranted: granted, permissionNote: note } : {}),
    };
    if (await send("PATCH", changes)) {
      setMessage("Saved.");
      router.refresh();
    }
  }

  async function resync() {
    setMessage(null);
    try {
      const response = await fetch(`/api/courses/${course.id}/resync`, { method: "POST" });
      const data = (await response.json()) as { ok: boolean; id?: number; message?: string };
      if (data.ok) router.push(`/admin/import/${data.id}`);
      else setMessage(data.message ?? "The re-sync could not start.");
    } catch {
      setMessage("The server did not answer. Try again.");
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    if (await send("DELETE")) {
      router.push("/courses");
      router.refresh();
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Sharing</h2>
      {needsPermission && isAdmin ? (
        <>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-primary" checked={granted} onChange={(event) => setGranted(event.target.checked)} />
            The author gave permission to publish this
          </label>
          <label className="flex flex-col gap-1 text-sm">
            When and how they agreed
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="2026-11-17, reply to my Lichess message"
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
          </label>
        </>
      ) : null}
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={isPublic && !locked}
          disabled={locked}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        Public
      </label>
      {locked ? (
        <p className="text-sm text-muted-foreground">
          An imported course stays private until the author&apos;s permission is recorded.
        </p>
      ) : null}
      {message ? <p className="text-sm">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button className="h-11 px-5" onClick={save}>
          Save
        </Button>
        {course.kind === "lichess_study" && isAdmin ? (
          <Button variant="outline" className="h-11 px-4" onClick={resync}>
            Re-sync from Lichess
          </Button>
        ) : null}
        <Button variant="destructive" className="h-11 px-4" onClick={remove}>
          Delete course
        </Button>
      </div>
    </section>
  );
}
