"use client";

import Link from "next/link";
import { openings, openingTabiya } from "@/data/openings";
import { StaticBoard } from "@/components/static-board";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OpeningDashboard() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="text-sm tracking-wide text-primary uppercase">Opening sprints</p>
      <h1 className="mt-1 font-heading text-4xl tracking-tight">Learn the move, then play it.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The board shows the position every variation of that opening still shares. Open it, then pick a line from the menu.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {openings.map((opening) => (
          <Link key={opening.id} href={`/openings/${opening.id}`} className="block h-full">
            <Card className="h-full overflow-hidden transition hover:ring-primary/50">
              <div className="p-4 pb-0">
                <StaticBoard fen={openingTabiya(opening)} />
              </div>
              <CardHeader>
                <CardTitle className="font-heading text-xl">{opening.name}</CardTitle>
                <CardDescription className="text-base leading-relaxed">{opening.idea}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
