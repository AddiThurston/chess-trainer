"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/sign-in-form";
import { cn } from "@/lib/utils";

export function BulkImportForm() {
  const router = useRouter();
  const [inputs, setInputs] = useState("");
  const [allowlist, setAllowlist] = useState("GM, IM, WGM, WIM");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setInputs(await file.text());
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, allowlist }),
      });
      const data = (await response.json()) as { ok: boolean; id?: number; message?: string };
      if (data.ok) router.push(`/admin/import/${data.id}`);
      else setError(data.message ?? "The import could not start.");
    } catch {
      setError("The server did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Import Lichess studies</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Paste study links, study IDs, and usernames in any mix. A username brings in all of that player&apos;s public
          studies. Only authors with a title on the list below are kept, and nothing becomes a course until you pick
          its chapters.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Studies and usernames, one per line
        <textarea
          value={inputs}
          onChange={(event) => setInputs(event.target.value)}
          rows={8}
          required
          spellCheck={false}
          placeholder={"https://lichess.org/study/abcdefgh\nabcdefgh\n@username"}
          className={cn(fieldClass, "py-2 font-mono text-sm")}
        />
        <span className="text-muted-foreground">
          Eight letters or digits on their own are read as a study ID. Put @ in front of a username that long.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Or upload a text file
        <input type="file" accept=".txt,text/plain" onChange={onFile} className="text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:text-foreground" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Titles to keep
        <input value={allowlist} onChange={(event) => setAllowlist(event.target.value)} required className={fieldClass} />
      </label>
      {error ? <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm">{error}</p> : null}
      <Button type="submit" className="h-11 self-start px-5" disabled={busy}>
        {busy ? "Starting…" : "Start import"}
      </Button>
    </form>
  );
}
