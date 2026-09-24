"use client";

import { useState, useSyncExternalStore } from "react";
import { Chess } from "chess.js";
import tacticsData from "@/data/tactics.json";
import { TrainerBoard } from "@/components/trainer-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  emptyTacticSnapshot,
  loadSolvedTactics,
  markTacticSolved,
  resetSolvedTactics,
  subscribeTactics,
} from "@/lib/storage";

type Puzzle = (typeof tacticsData)[number];

const puzzles = tacticsData as Puzzle[];

type Session = {
  id: string;
  step: number;
  misses: number;
  note: string;
  error: string | null;
};

const freshSession: Session = { id: "", step: 0, misses: 0, note: "Find the move.", error: null };

function replay(puzzle: Puzzle, step: number) {
  const chess = new Chess(puzzle.fen);
  if (chess.turn() !== puzzle.side) {
    return { fen: puzzle.fen, lastMove: null as { from: string; to: string } | null, error: "Side to move does not match the puzzle." };
  }
  let lastMove: { from: string; to: string } | null = null;
  for (let index = 0; index < step; index += 1) {
    let played;
    try {
      played = chess.move(puzzle.solution[index]);
    } catch {
      played = null;
    }
    if (!played) {
      return { fen: puzzle.fen, lastMove: null, error: "The solution line could not be played." };
    }
    lastMove = { from: played.from, to: played.to };
  }
  return { fen: chess.fen(), lastMove, error: null as string | null };
}

export function TacticsTrainer() {
  const solved = useSyncExternalStore(subscribeTactics, loadSolvedTactics, emptyTacticSnapshot);
  const [cursor, setCursor] = useState<number | null>(null);
  const [session, setSession] = useState<Session>(freshSession);

  if (!puzzles.length) {
    return <p className="px-4 py-10">The puzzle file is empty.</p>;
  }

  const unsolvedIndex = puzzles.findIndex((item) => !solved.includes(item.id));
  const index = cursor ?? unsolvedIndex;

  if (index < 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-4xl">The set is clear.</h1>
        <p className="mt-3 text-muted-foreground">You have solved all {puzzles.length} puzzles stored on this browser.</p>
        <Button
          className="mt-6 min-h-11"
          onClick={() => {
            resetSolvedTactics();
            setCursor(null);
            setSession(freshSession);
          }}
        >
          Start the set again
        </Button>
      </div>
    );
  }

  const puzzle = puzzles[index];
  const active = session.id === puzzle.id ? session : freshSession;
  const played = replay(puzzle, active.step);
  const error = active.error ?? played.error;
  const side = puzzle.side === "b" ? "b" : "w";
  const solvedThis = solved.includes(puzzle.id);

  function goTo(next: number | null) {
    setCursor(next);
    setSession(freshSession);
  }

  function onMove(move: { from: string; to: string; promotion?: string }) {
    if (error || solvedThis || active.step >= puzzle.solution.length) return false;
    const expectedSan = puzzle.solution[active.step];
    const chess = new Chess(played.fen);
    let expected;
    try {
      expected = chess.move(expectedSan);
    } catch {
      setSession({ ...active, id: puzzle.id, error: "The solution line could not be played." });
      return false;
    }
    if (!expected) return false;
    const same =
      expected.from === move.from &&
      expected.to === move.to &&
      (expected.promotion ?? undefined) === (move.promotion ?? undefined);
    if (!same) {
      const nextMisses = active.misses + 1;
      setSession({
        id: puzzle.id,
        step: active.step,
        misses: nextMisses,
        error: null,
        note: nextMisses >= 2 ? `${puzzle.comment} The move is ${expected.san}.` : puzzle.comment,
      });
      return false;
    }

    let nextStep = active.step + 1;
    if (nextStep < puzzle.solution.length && chess.turn() !== side) {
      let reply;
      try {
        reply = chess.move(puzzle.solution[nextStep]);
      } catch {
        reply = null;
      }
      if (!reply) {
        setSession({ ...active, id: puzzle.id, error: "The puzzle reply could not be played." });
        return false;
      }
      nextStep += 1;
    }

    if (nextStep >= puzzle.solution.length || chess.isCheckmate()) {
      markTacticSolved(puzzle.id);
      setCursor(index);
      setSession({ id: puzzle.id, step: nextStep, misses: 0, note: puzzle.comment, error: null });
      return true;
    }
    setSession({ id: puzzle.id, step: nextStep, misses: 0, note: "Keep going.", error: null });
    return true;
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,640px)_minmax(260px,1fr)]">
      <TrainerBoard
        fen={played.fen}
        orientation={side === "w" ? "white" : "black"}
        playerColor={side}
        interactive={!error && !solvedThis && active.step < puzzle.solution.length}
        lastMove={played.lastMove}
        boardId={`tactic-${puzzle.id}`}
        onMove={onMove}
      />
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Tactics</p>
          <CardTitle className="font-heading text-2xl capitalize">{puzzle.theme}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>
              {solved.length} of {puzzles.length} solved
            </Badge>
            <Badge variant="outline">Puzzle {index + 1}</Badge>
          </div>
          {error ? (
            <div className="rounded-lg bg-destructive/15 px-3 py-3 text-sm">
              <p>{error}</p>
              <Button className="mt-3 min-h-11" variant="outline" onClick={() => goTo(index + 1 < puzzles.length ? index + 1 : null)}>
                Skip to the next puzzle
              </Button>
            </div>
          ) : (
            <p className="min-h-12 text-base">{solvedThis ? puzzle.comment : active.note}</p>
          )}
          {solvedThis ? <p className="font-heading text-3xl text-primary">Solved.</p> : null}
          <div className="flex flex-wrap gap-2">
            {solvedThis ? (
              <Button className="min-h-11" onClick={() => goTo(unsolvedIndex < 0 ? null : unsolvedIndex)}>
                Next puzzle
              </Button>
            ) : null}
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => {
                resetSolvedTactics();
                setCursor(0);
                setSession(freshSession);
              }}
            >
              Reset score
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
