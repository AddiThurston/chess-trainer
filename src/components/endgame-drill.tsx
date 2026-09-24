"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import type { Endgame } from "@/data/endgames";
import { TrainerBoard } from "@/components/trainer-board";
import { EngineNote } from "@/components/engine-note";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { endgameReply, probeBinary, type EngineSource } from "@/lib/engine-client";
import { assessEndgame } from "@/lib/endgame-result";

function openingStatus(fen: string, user: "w" | "b") {
  return new Chess(fen).turn() === user ? "Your move." : "Looking for a sensible reply…";
}

export function EndgameDrill({ drill }: { drill: Endgame }) {
  const requestRef = useRef(0);
  const [fen, setFen] = useState(drill.fen);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [status, setStatus] = useState(() => openingStatus(drill.fen, drill.user));
  const [outcome, setOutcome] = useState<"playing" | "success" | "failure">("playing");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<EngineSource | null>(null);
  const [binary, setBinary] = useState<boolean | null>(null);
  const [userMoves, setUserMoves] = useState(0);

  const turn = new Chess(fen).turn();
  const thinking = outcome === "playing" && !error && turn !== drill.user && !new Chess(fen).isGameOver();

  function commit(chess: Chess, move: { from: string; to: string }, moves: number) {
    const result = assessEndgame(chess, drill, moves);
    setFen(chess.fen());
    setLastMove(move);
    setUserMoves(moves);
    if (result.state !== "playing") {
      setOutcome(result.state);
      setStatus(result.message);
      return;
    }
    setStatus(openingStatus(chess.fen(), drill.user));
  }

  function reset() {
    requestRef.current += 1;
    setUserMoves(0);
    setFen(drill.fen);
    setLastMove(null);
    setOutcome("playing");
    setError(null);
    setSource(null);
    setStatus(openingStatus(drill.fen, drill.user));
  }

  useEffect(() => {
    let cancelled = false;
    probeBinary().then((probe) => {
      if (!cancelled) setBinary(probe.binary);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (outcome !== "playing" || error) return;
    const chess = new Chess(fen);
    if (chess.turn() === drill.user || chess.isGameOver()) return;
    const requestId = ++requestRef.current;
    let cancelled = false;
    endgameReply(fen)
      .then((reply) => {
        if (cancelled || requestId !== requestRef.current) return;
        const played = chess.move(reply.san);
        if (!played) throw new Error("The reply was illegal.");
        setSource(reply.source);
        setBinary((current) => (reply.binaryMissing ? false : current));
        const result = assessEndgame(chess, drill, userMoves);
        setFen(chess.fen());
        setLastMove({ from: played.from, to: played.to });
        if (result.state !== "playing") {
          setOutcome(result.state);
          setStatus(result.message);
          return;
        }
        setStatus(openingStatus(chess.fen(), drill.user));
      })
      .catch((reason: unknown) => {
        if (cancelled || requestId !== requestRef.current) return;
        setError(reason instanceof Error ? reason.message : "The reply failed.");
        setStatus("No reply yet.");
      });
    return () => {
      cancelled = true;
    };
  }, [fen, outcome, error, drill, userMoves]);

  function onMove(move: { from: string; to: string; promotion?: string }) {
    if (outcome !== "playing" || error || turn !== drill.user) return false;
    const chess = new Chess(fen);
    let played;
    try {
      played = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion as "q" | "r" | "b" | "n" | undefined,
      });
    } catch {
      return false;
    }
    if (!played) return false;
    commit(chess, { from: played.from, to: played.to }, userMoves + 1);
    return true;
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,640px)_minmax(260px,1fr)]">
      <TrainerBoard
        fen={fen}
        orientation={drill.user === "w" ? "white" : "black"}
        playerColor={drill.user}
        interactive={outcome === "playing" && !thinking && !error && turn === drill.user}
        lastMove={lastMove}
        boardId={`endgame-${drill.id}`}
        onMove={onMove}
      />
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Endgame</p>
          <CardTitle className="font-heading text-2xl">{drill.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p>{drill.goal}</p>
          <p className="text-sm text-muted-foreground">{drill.hint}</p>
          <p className="min-h-12 text-base">{thinking ? "Looking for a sensible reply…" : status}</p>
          {drill.goalType === "draw" && outcome === "playing" ? (
            <p className="text-sm text-muted-foreground">Held for {userMoves} of 12 moves.</p>
          ) : null}
          {outcome === "success" ? <p className="font-heading text-3xl text-primary">Done.</p> : null}
          {outcome === "failure" ? <p className="font-heading text-3xl">Not this time.</p> : null}
          <EngineNote binary={binary} source={source} error={error} />
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={reset}>
              Repeat
            </Button>
            {error ? (
              <Button className="min-h-11" variant="outline" onClick={() => setError(null)}>
                Try the reply again
              </Button>
            ) : null}
            <Link href="/endgames" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
              All endgames
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
