"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import type { Endgame, EndgamePosition } from "@/data/endgames";
import { TrainerBoard } from "@/components/trainer-board";
import { EngineNote } from "@/components/engine-note";
import { EvalBar } from "@/components/eval-bar";
import { CoachToggles, GradeLine, useCoachOptions, usePositionEval } from "@/components/coach-options";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { endgameReply, probeBinary, type EngineSource } from "@/lib/engine-client";
import { assessEndgame } from "@/lib/endgame-result";
import { gradeText, ratePlayedMove } from "@/lib/rate-move";
import type { GradeName } from "@/lib/eval";

function openingStatus(fen: string, user: "w" | "b") {
  return new Chess(fen).turn() === user ? "Your move." : "Stockfish is thinking…";
}

function uciOf(from: string, to: string, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}

export function EndgameDrill({ drill }: { drill: Endgame }) {
  const requestRef = useRef(0);
  const [position, setPosition] = useState<EndgamePosition>(drill.positions[0]);
  const [fen, setFen] = useState(drill.positions[0].fen);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [status, setStatus] = useState(() => openingStatus(drill.positions[0].fen, drill.user));
  const [outcome, setOutcome] = useState<"playing" | "success" | "failure">("playing");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<EngineSource | null>(null);
  const [binary, setBinary] = useState<boolean | null>(null);
  const [userMoves, setUserMoves] = useState(0);
  const [grades, setGrades] = useState<{ san: string; grade: GradeName }[]>([]);
  const { showEval, rateMoves, toggleEval, toggleRate } = useCoachOptions();
  const whiteCp = usePositionEval(fen, showEval);

  const turn = new Chess(fen).turn();
  const thinking = outcome === "playing" && !error && turn !== drill.user && !new Chess(fen).isGameOver();

  function load(next: EndgamePosition) {
    requestRef.current += 1;
    setPosition(next);
    setUserMoves(0);
    setFen(next.fen);
    setLastMove(null);
    setOutcome("playing");
    setError(null);
    setSource(null);
    setGrades([]);
    setStatus(openingStatus(next.fen, drill.user));
  }

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

  useEffect(() => {
    const next = drill.positions[Math.floor(Math.random() * drill.positions.length)] ?? drill.positions[0];
    load(next);
    // A fresh visit should draw one position from the database.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill.id]);

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
    const fenBefore = fen;
    let cancelled = false;
    endgameReply(fen)
      .then(async (reply) => {
        if (cancelled || requestId !== requestRef.current) return;
        const played = chess.move(reply.san);
        if (!played) throw new Error("The reply was illegal.");
        setSource(reply.source);
        setBinary((current) => (reply.binaryMissing ? false : current));
        if (rateMoves && reply.uci) {
          const grade = await ratePlayedMove(fenBefore, reply.uci, false);
          if (!cancelled && requestId === requestRef.current) {
            setGrades((current) => [...current, { san: played.san, grade }]);
          }
        }
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
  }, [fen, outcome, error, drill, userMoves, rateMoves]);

  function onMove(move: { from: string; to: string; promotion?: string }) {
    if (outcome !== "playing" || error || turn !== drill.user) return false;
    const chess = new Chess(fen);
    const fenBefore = fen;
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
    if (rateMoves) {
      const uci = uciOf(played.from, played.to, played.promotion);
      void ratePlayedMove(fenBefore, uci, false).then((grade) => {
        setGrades((current) => [...current, { san: played.san, grade }]);
      });
    }
    commit(chess, { from: played.from, to: played.to }, userMoves + 1);
    return true;
  }

  const orientation = drill.user === "w" ? "white" : "black";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,640px)_minmax(260px,1fr)]">
      <div className="flex items-stretch gap-2">
        {showEval ? <EvalBar whiteCp={whiteCp} orientation={orientation} /> : null}
        <div className="min-w-0 flex-1">
          <TrainerBoard
            fen={fen}
            orientation={orientation}
            playerColor={drill.user}
            interactive={outcome === "playing" && !thinking && !error && turn === drill.user}
            lastMove={lastMove}
            boardId={`endgame-${drill.id}`}
            onMove={onMove}
          />
        </div>
      </div>
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Endgame</p>
          <CardTitle className="font-heading text-2xl">{drill.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Position
            <select
              className="min-h-11 rounded-lg border border-input bg-background px-3"
              value={position.id}
              onChange={(event) => {
                const next = drill.positions.find((item) => item.id === event.target.value);
                if (next) load(next);
              }}
            >
              {drill.positions.map((item, index) => (
                <option key={item.id} value={item.id}>
                  Position {index + 1}
                </option>
              ))}
            </select>
          </label>
          <p>{drill.goal}</p>
          <p className="text-sm text-muted-foreground">{drill.hint}</p>
          <p className="min-h-12 text-base">{thinking ? "Stockfish is thinking…" : status}</p>
          {drill.goalType === "draw" && outcome === "playing" ? (
            <p className="text-sm text-muted-foreground">Held for {userMoves} of 12 moves.</p>
          ) : null}
          {outcome === "success" ? <p className="font-heading text-3xl text-primary">Done.</p> : null}
          {outcome === "failure" ? <p className="font-heading text-3xl">Not this time.</p> : null}
          {rateMoves && grades.length > 0 ? (
            <div className="flex flex-col gap-1">
              {grades.slice(-6).map((item, index) => (
                <GradeLine key={`${item.san}-${index}`} san={item.san} grade={item.grade} />
              ))}
            </div>
          ) : null}
          <CoachToggles showEval={showEval} rateMoves={rateMoves} onEval={toggleEval} onRate={toggleRate} />
          <EngineNote binary={binary} source={source} error={error} />
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={() => load(position)}>
              Repeat
            </Button>
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => {
                const next = drill.positions[Math.floor(Math.random() * drill.positions.length)] ?? position;
                load(next);
              }}
            >
              New position
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
          {grades.at(-1) ? <p className="sr-only">{gradeText(grades.at(-1)!.grade)}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
