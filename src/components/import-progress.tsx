"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ImportTask } from "@/lib/imports";
import { cn } from "@/lib/utils";

type Job = { id: number; allowlist: string[]; tasks: ImportTask[] };

const STATUS_STYLE: Record<ImportTask["status"], string> = {
  queued: "bg-secondary text-muted-foreground",
  running: "bg-due text-primary-foreground",
  done: "bg-primary text-primary-foreground",
  skipped: "bg-secondary text-foreground",
  failed: "bg-destructive/20 text-destructive",
};

function label(task: ImportTask) {
  if (task.kind === "titles") return "Look up titles";
  return task.kind === "user" ? `All studies by ${task.target}` : `Study ${task.target}`;
}

export function ImportProgress({ job: initial }: { job: Job }) {
  const [job, setJob] = useState(initial);
  const open = job.tasks.filter((task) => task.status === "queued" || task.status === "running").length;
  const skipped = job.tasks.filter((task) => task.status === "skipped");

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      fetch(`/api/admin/imports/${job.id}`)
        .then((response) => response.json())
        .then((data: { ok: boolean; job?: Job }) => {
          if (data.job) setJob(data.job);
        })
        .catch(() => {});
    }, 2000);
    return () => window.clearInterval(timer);
  }, [open, job.id]);

  const finished = job.tasks.length - open;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">{open ? "Importing…" : "Import finished"}</h1>
        <p className="mt-2 text-muted-foreground">
          {finished} of {job.tasks.length} tasks done. Keeping authors titled {job.allowlist.join(", ")}. Requests go to
          Lichess one at a time.
        </p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={job.tasks.length} aria-valuenow={finished}>
          <div className="h-full bg-primary transition-[width]" style={{ width: `${(finished / job.tasks.length) * 100}%` }} />
        </div>
      </div>

      {skipped.length ? (
        <section className="rounded-xl bg-card p-4">
          <h2 className="font-heading text-lg font-bold">Skipped</h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {skipped.map((task) => (
              <li key={task.id}>
                <span className="font-semibold">{task.target}</span>
                <span className="text-muted-foreground"> {task.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="flex flex-col divide-y divide-border rounded-xl bg-card">
        {job.tasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <span className={cn("rounded px-2 py-0.5 text-xs font-bold", STATUS_STYLE[task.status])}>{task.status}</span>
            <span className="font-semibold">{label(task)}</span>
            {task.detail && task.status !== "skipped" ? (
              <span className="w-full text-sm text-muted-foreground">{task.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>

      {open ? null : (
        <Link href="/admin/chapters" className={cn(buttonVariants(), "h-11 self-start px-5")}>
          Choose chapters
        </Link>
      )}
    </div>
  );
}
