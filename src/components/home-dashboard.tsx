"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { BookOpen, Crown, Puzzle, Swords } from "lucide-react";
import { TrainerBoard } from "@/components/trainer-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  emptyOpeningSnapshot,
  emptyTacticSnapshot,
  loadOpeningStats,
  loadSolvedTactics,
  openingSummary,
  subscribeOpeningStats,
  subscribeTactics,
} from "@/lib/storage";
import { openings } from "@/data/openings";
import tactics from "@/data/tactics.json";

const modes = [
  {
    href: "/openings",
    title: "Opening sprints",
    icon: BookOpen,
    copy: "Pick a line and a color. You play your moves. The book answers at once.",
  },
  {
    href: "/endgames",
    title: "Endgames",
    icon: Crown,
    copy: "Queen and rook mates, the pawn, Lucena, and Philidor. One result, then repeat.",
  },
  {
    href: "/tactics",
    title: "Tactics",
    icon: Puzzle,
    copy: "Mate, fork, pin, skewer, discovery, and the back rank. One puzzle at a time.",
  },
  {
    href: "/play",
    title: "Play the bot",
    icon: Swords,
    copy: "A full game from the start, or from the tabiya of a line you just drilled.",
  },
];

export function HomeDashboard() {
  const stats = useSyncExternalStore(subscribeOpeningStats, loadOpeningStats, emptyOpeningSnapshot);
  const solved = useSyncExternalStore(subscribeTactics, loadSolvedTactics, emptyTacticSnapshot);

  let bestStreak = 0;
  for (const opening of openings) {
    bestStreak = Math.max(
      bestStreak,
      openingSummary(stats, opening.id, "white").best,
      openingSummary(stats, opening.id, "black").best,
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-start">
      <div>
        <p className="text-sm tracking-wide text-primary uppercase">Evening session</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance sm:text-5xl">The board is set.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Four ways to work tonight: drill a book line until it is clean, finish an ending, solve a tactic, or sit down for a game.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="secondary">Best clean streak {bestStreak}</Badge>
          <Badge variant="outline">
            {solved.length} of {tactics.length} tactics solved
          </Badge>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <Link key={mode.href} href={mode.href} className="block h-full">
              <Card className="h-full transition hover:ring-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-xl">
                    <mode.icon className="size-4 text-primary" />
                    {mode.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">{mode.copy}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Green and cream</CardTitle>
          <CardDescription>The board stays classical. The room stays dark.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrainerBoard fen={new Chess().fen()} interactive={false} boardId="home" onMove={() => false} />
        </CardContent>
      </Card>
    </div>
  );
}
