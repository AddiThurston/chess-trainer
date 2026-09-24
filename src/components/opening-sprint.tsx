"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { getOpening } from "@/data/openings";
import { TrainerBoard } from "@/components/trainer-board";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  emptyLineStats,
  emptyOpeningSnapshot,
  lineKey,
  loadOpeningStats,
  recordOpeningFinish,
  recordOpeningMistake,
  subscribeOpeningStats,
} from "@/lib/storage";

const START_FEN = new Chess().fen();

export function OpeningSprint({
  openingId,
  lineId,
  color,
}: {
  openingId: string;
  lineId: string;
  color: "white" | "black";
}) {
  const opening = getOpening(openingId);
  const line = opening?.lines.find((item) => item.id === lineId);
  const key = line ? lineKey(openingId, line.id, color) : "";
  const user = color === "white" ? "w" : "b";
  const stats = useSyncExternalStore(subscribeOpeningStats, loadOpeningStats, emptyOpeningSnapshot);

  const mistakesRef = useRef(0);
  const savedRef = useRef(false);
  const [fen, setFen] = useState(START_FEN);
  const [ply, setPly] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState(color === "white" ? "Your move." : "The book is answering…");
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finished = Boolean(line && ply >= line.moves.length);
  const turn = new Chess(fen).turn();
  const yourTurn = Boolean(line) && !finished && !error && turn === user;

  function boot() {
    mistakesRef.current = 0;
    savedRef.current = false;
    setFen(START_FEN);
    setPly(0);
    setMistakes(0);
    setHint(null);
    setLastMove(null);
    setError(null);
    setStatus(color === "white" ? "Your move." : "The book is answering…");
  }

  useEffect(() => {
    if (!line || ply < line.moves.length || savedRef.current) return;
    savedRef.current = true;
    recordOpeningFinish(loadOpeningStats(), key, mistakesRef.current === 0);
  }, [ply, line, key]);

  useEffect(() => {
    if (!line || finished || error || yourTurn) return;
    const san = line.moves[ply];
    const timer = window.setTimeout(() => {
      const chess = new Chess(fen);
      let played;
      try {
        played = chess.move(san);
      } catch {
        played = null;
      }
      if (!played) {
        setError("This book move could not be played.");
        setStatus("The sprint stopped on a bad move in the book.");
        return;
      }
      setLastMove({ from: played.from, to: played.to });
      setFen(chess.fen());
      setPly((current) => current + 1);
      setStatus(`Book played ${played.san}.`);
    }, 360);
    return () => window.clearTimeout(timer);
  }, [ply, finished, line, error, yourTurn, fen]);

  if (!opening || !line) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-3xl">That line is not in the book.</h1>
        <p className="mt-3 text-muted-foreground">Pick another from the opening list.</p>
        <Link href="/openings" className={cn(buttonVariants(), "mt-6 min-h-11")}>
          All openings
        </Link>
      </div>
    );
  }

  const book = line;

  function onMove(move: { from: string; to: string; promotion?: string }) {
    if (!yourTurn) return false;
    const chess = new Chess(fen);
    let expected;
    try {
      expected = chess.move(book.moves[ply]);
    } catch {
      expected = null;
    }
    if (!expected) {
      setError("The book move is missing.");
      setStatus("The sprint stopped on a bad move in the book.");
      return false;
    }
    const same =
      expected.from === move.from &&
      expected.to === move.to &&
      (expected.promotion ?? undefined) === (move.promotion ?? undefined);
    if (!same) {
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
      recordOpeningMistake(loadOpeningStats(), key);
      setHint({ from: expected.from, to: expected.to });
      setStatus(`Not the book move. Play ${expected.san}.`);
      return false;
    }
    setHint(null);
    setLastMove({ from: move.from, to: move.to });
    setFen(chess.fen());
    setPly((current) => current + 1);
    setStatus("Played.");
    return true;
  }

  const row = stats[key] ?? emptyLineStats();
  const runLabel = finished
    ? mistakes === 0
      ? "Clean run."
      : `${mistakes} mistake${mistakes === 1 ? "" : "s"}.`
    : null;
  const shownStatus = finished
    ? mistakes === 0
      ? "The line is clean."
      : "The line is done. Repeat it while the miss is fresh."
    : status;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,640px)_minmax(260px,1fr)]">
      <TrainerBoard
        fen={fen}
        orientation={color}
        playerColor={user}
        interactive={yourTurn}
        lastMove={lastMove}
        hintMove={hint}
        boardId={`sprint-${line.id}`}
        onMove={onMove}
      />
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">{opening.name}</p>
          <CardTitle className="font-heading text-2xl">{line.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{line.note}</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="capitalize">{color}</Badge>
            <Badge variant="outline">This run: {mistakes} mistakes</Badge>
            <Badge variant="secondary">Best clean streak {row.bestCleanStreak}</Badge>
          </div>
          <p className="min-h-12 text-base">{shownStatus}</p>
          {runLabel ? <p className="font-heading text-3xl">{runLabel}</p> : null}
          {!finished && !yourTurn && !error ? (
            <p className="text-sm text-muted-foreground">The book is answering…</p>
          ) : null}
          {error ? (
            <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm">{error}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={boot} disabled={!finished && !yourTurn && !error}>
              Repeat
            </Button>
            <Link href="/openings" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
              All openings
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Total mistakes on this line as {color}: {row.totalMistakes}. Attempts: {row.attempts}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
