"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { fieldClass } from "@/components/sign-in-form";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; id?: number; message?: string; warnings?: string[] };

export function PgnImportForm() {
  const [pgn, setPgn] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPgn(await file.text());
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form), pgn }),
      });
      setResult((await response.json()) as Result);
    } catch {
      setResult({ ok: false, message: "The server did not answer. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Import a PGN</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Every game in the file becomes a chapter, and all chapters merge into one tree. The course starts private.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input name="title" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea name="description" rows={2} className={cn(fieldClass, "py-2")} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Written for
        <select name="color" className={fieldClass} defaultValue="">
          <option value="">Work it out from the lines</option>
          <option value="w">White</option>
          <option value="b">Black</option>
        </select>
      </label>
      <fieldset className="grid gap-4 rounded-xl bg-card p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm text-muted-foreground">Who wrote it and where it came from</legend>
        <label className="flex flex-col gap-1 text-sm">
          Author
          <input name="authorName" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Author&apos;s title
          <input name="authorTitle" placeholder="GM" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Author&apos;s page
          <input name="authorUrl" type="url" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Source name
          <input name="sourceName" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Source link
          <input name="sourceUrl" type="url" className={fieldClass} />
        </label>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        PGN file
        <input type="file" accept=".pgn,.txt,text/plain" onChange={onFile} className="text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:text-foreground" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Or paste the PGN
        <textarea
          value={pgn}
          onChange={(event) => setPgn(event.target.value)}
          rows={12}
          required
          spellCheck={false}
          className={cn(fieldClass, "py-2 font-mono text-sm")}
        />
      </label>
      {result && !result.ok ? (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm">{result.message ?? "The import failed."}</p>
      ) : null}
      {result?.warnings?.length ? (
        <ul className="list-disc rounded-lg bg-due/15 py-2 pr-3 pl-7 text-sm">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {result?.ok ? (
        <Link href={`/courses/${result.id}`} className={cn(buttonVariants({ variant: "secondary" }), "h-11 self-start px-4")}>
          Imported. Open the course
        </Link>
      ) : (
        <Button type="submit" className="h-11 self-start px-5" disabled={busy}>
          {busy ? "Importing…" : "Import course"}
        </Button>
      )}
    </form>
  );
}
