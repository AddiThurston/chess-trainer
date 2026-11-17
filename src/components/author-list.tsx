"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TitleBadge } from "@/components/title-badge";
import { Button } from "@/components/ui/button";
import type { AuthorListing } from "@/lib/imports";

function AuthorRow({ author }: { author: AuthorListing }) {
  const router = useRouter();
  const [granted, setGranted] = useState(author.permissionGranted);
  const [note, setNote] = useState(author.permissionNote);
  const [message, setMessage] = useState<string | null>(null);

  async function send(method: "PATCH" | "POST") {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/authors/${author.username}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PATCH" ? JSON.stringify({ permissionGranted: granted, permissionNote: note }) : undefined,
      });
      const data = (await response.json()) as { ok: boolean; id?: number; message?: string };
      if (!data.ok) setMessage(data.message ?? "That did not save.");
      else if (method === "POST") router.push(`/admin/import/${data.id}`);
      else {
        setMessage("Saved.");
        router.refresh();
      }
    } catch {
      setMessage("The server did not answer. Try again.");
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <TitleBadge title={author.title} />
        <a href={`https://lichess.org/@/${author.name}`} target="_blank" rel="noreferrer" className="font-heading text-lg font-bold underline-offset-4 hover:underline">
          {author.name}
        </a>
        <span className="text-sm text-muted-foreground">
          {author.studies} {author.studies === 1 ? "study" : "studies"} fetched, {author.courses}{" "}
          {author.courses === 1 ? "course" : "courses"}
        </span>
        <span className={author.permissionGranted ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-due"}>
          {author.permissionGranted ? "Permission granted" : "No permission yet"}
        </span>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5 accent-primary" checked={granted} onChange={(event) => setGranted(event.target.checked)} />
        This author gave permission to publish their courses
      </label>
      <label className="flex flex-col gap-1 text-sm">
        When and how they agreed
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      {message ? <p className="text-sm">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button className="h-11 px-5" onClick={() => send("PATCH")}>
          Save
        </Button>
        <Button variant="outline" className="h-11 px-4" onClick={() => send("POST")}>
          Re-sync from Lichess
        </Button>
      </div>
    </li>
  );
}

export function AuthorList({ authors }: { authors: AuthorListing[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Authors</h1>
        <p className="mt-2 text-muted-foreground">
          An author&apos;s courses stay private until their permission is recorded here. Taking it back makes their
          courses private again.
        </p>
      </div>
      {authors.length ? (
        <ul className="flex flex-col gap-4">
          {authors.map((author) => (
            <AuthorRow key={author.username} author={author} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No authors yet. They appear here once an import fetches their studies.</p>
      )}
    </div>
  );
}
