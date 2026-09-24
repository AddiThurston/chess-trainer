"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { openings } from "@/data/openings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  emptyLineStats,
  emptyOpeningSnapshot,
  lineKey,
  loadOpeningStats,
  openingSummary,
  subscribeOpeningStats,
} from "@/lib/storage";

export function OpeningDashboard() {
  const [color, setColor] = useState<"white" | "black">("white");
  const stats = useSyncExternalStore(subscribeOpeningStats, loadOpeningStats, emptyOpeningSnapshot);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-wide text-primary uppercase">Opening sprints</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">Learn the move, then play it.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Choose an opening, a line, and a color. You move only for your side. A miss stops the line until you play the book move.
          </p>
        </div>
        <div className="flex gap-2">
          {(["white", "black"] as const).map((choice) => (
            <Button
              key={choice}
              variant={color === choice ? "default" : "outline"}
              className="min-h-11 min-w-24 capitalize"
              onClick={() => setColor(choice)}
            >
              {choice}
            </Button>
          ))}
        </div>
      </div>

      {openings.length === 0 ? <p className="mt-8 text-muted-foreground">No openings are loaded.</p> : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {openings.map((opening) => {
          const summary = openingSummary(stats, opening.id, color);
          return (
            <Card key={opening.id}>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">{opening.name}</CardTitle>
                <CardDescription className="text-base leading-relaxed">{opening.idea}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {summary.attempts === 0 && summary.mistakes === 0 ? (
                  <p className="text-sm text-muted-foreground">No sprints yet as {color}.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Badge>Best clean streak {summary.best}</Badge>
                    <Badge variant="outline">{summary.mistakes} mistakes</Badge>
                  </div>
                )}
                <ul className="flex flex-col gap-2">
                  {opening.lines.map((line) => {
                    const row = stats[lineKey(opening.id, line.id, color)] ?? emptyLineStats();
                    return (
                      <li key={line.id}>
                        <Link
                          href={`/openings/${opening.id}?line=${line.id}&color=${color}`}
                          className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 hover:bg-muted"
                        >
                          <span>
                            <span className="block font-medium">{line.name}</span>
                            <span className="block text-sm text-muted-foreground">{line.note}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs text-muted-foreground">
                            {row.attempts === 0 && row.totalMistakes === 0 ? "New" : `Streak ${row.bestCleanStreak}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
