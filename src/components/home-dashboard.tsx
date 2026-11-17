"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BookOpen, Crown, Puzzle, Swords } from "lucide-react";
import { StaticBoard } from "@/components/static-board";
import { buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

// The Italian after 5.d3: a position most courses on 1.e4 e5 pass through.
const HERO_FEN = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5";

const modes = [
  {
    href: "/openings",
    title: "Opening sprints",
    icon: BookOpen,
    copy: "Pick a line and a color. You play your moves and the book answers at once.",
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <section className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,400px)]">
        <div>
          <h1 className="font-heading text-5xl leading-[1.02] font-extrabold text-balance sm:text-6xl">
            Know what you play before move one.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Load an opening course, walk its lines on the board, and keep the positions you miss coming back until
            they stick.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/courses" className={cn(buttonVariants(), "h-12 px-6 text-base")}>
              Browse courses
            </Link>
            <Link href="/play" className={cn(buttonVariants({ variant: "secondary" }), "h-12 px-6 text-base")}>
              Play the bot
            </Link>
          </div>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-[0_6px_0_rgba(0,0,0,0.25)]">
          <StaticBoard fen={HERO_FEN} />
        </div>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold">Practice</h2>
          <p className="text-sm text-muted-foreground">
            Best clean streak {bestStreak}. {solved.length} of {tactics.length} tactics solved.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modes.map((mode) => (
            <Link
              key={mode.href}
              href={mode.href}
              className="rounded-xl bg-card p-5 ring-1 ring-foreground/5 hover:bg-popover"
            >
              <mode.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-heading text-lg font-bold">{mode.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{mode.copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
