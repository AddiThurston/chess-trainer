"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { openings } from "@/data/openings";
import { TrainerBoard } from "@/components/trainer-board";
import { EngineNote } from "@/components/engine-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { playEngine, probeBinary, type EngineSource } from "@/lib/engine-client";
import { levelIds, levels, type LevelId } from "@/lib/levels";

type StartChoice = { id: string; label: string; moves: string[] };

function describe(chess: Chess, user: "w" | "b") {
  if (chess.isCheckmate()) {
    return chess.turn() === user ? "Checkmate. The bot wins." : "Checkmate. You win.";
  }
  if (chess.isStalemate()) return "Stalemate.";
  if (chess.isInsufficientMaterial()) return "Drawn by insufficient material.";
  if (chess.isThreefoldRepetition()) return "Drawn by repetition.";
  if (chess.isDraw()) return "Drawn.";
  return null;
}

export function BotGame() {
  const starts = useMemo<StartChoice[]>(() => {
    const choices: StartChoice[] = [{ id: "start", label: "Starting position", moves: [] }];
    for (const opening of openings) {
      for (const line of opening.lines) {
        choices.push({
          id: `${opening.id}:${line.id}`,
          label: `${opening.name} · ${line.name}`,
          moves: line.moves,
        });
      }
    }
    return choices;
  }, []);

  const requestRef = useRef(0);
  const [startId, setStartId] = useState("start");
  const [level, setLevel] = useState<LevelId>("casual");
  const [color, setColor] = useState<"white" | "black">("white");
  const [fen, setFen] = useState(() => new Chess().fen());
  const [sans, setSans] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState("Your move.");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<EngineSource | null>(null);
  const [binary, setBinary] = useState<boolean | null>(null);

  const user = color === "white" ? "w" : "b";
  const turn = new Chess(fen).turn();
  const thinking = !result && !error && turn !== user && !new Chess(fen).isGameOver();

  function begin(nextStart = startId, nextColor = color) {
    requestRef.current += 1;
    const choice = starts.find((item) => item.id === nextStart) ?? starts[0];
    const chess = new Chess();
    try {
      for (const san of choice.moves) chess.move(san);
    } catch {
      setError("That opening line could not be replayed.");
      setStatus("The line could not be loaded.");
      return;
    }
    const side = nextColor === "white" ? "w" : "b";
    const done = describe(chess, side);
    setFen(chess.fen());
    setSans(chess.history());
    setLastMove(null);
    setResult(done);
    setError(null);
    setSource(null);
    setStatus(done ?? (chess.turn() === side ? "Your move." : "The bot is thinking…"));
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
    if (result || error) return;
    const chess = new Chess(fen);
    if (chess.turn() === user || chess.isGameOver()) return;
    const requestId = ++requestRef.current;
    let cancelled = false;
    playEngine(fen, level)
      .then((reply) => {
        if (cancelled || requestId !== requestRef.current) return;
        const played = chess.move(reply.san);
        if (!played) throw new Error("The bot played an illegal move.");
        setSource(reply.source);
        if (reply.binaryMissing) setBinary(false);
        setFen(chess.fen());
        setSans((current) => [...current, played.san]);
        setLastMove({ from: played.from, to: played.to });
        const done = describe(chess, user);
        setResult(done);
        setStatus(done ?? "Your move.");
      })
      .catch((reason: unknown) => {
        if (cancelled || requestId !== requestRef.current) return;
        setError(reason instanceof Error ? reason.message : "The bot could not move.");
        setStatus("The bot stopped.");
      });
    return () => {
      cancelled = true;
    };
  }, [fen, result, error, user, level]);

  function onMove(move: { from: string; to: string; promotion?: string }) {
    if (result || error || turn !== user) return false;
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
    setFen(chess.fen());
    setSans((current) => [...current, played.san]);
    setLastMove({ from: played.from, to: played.to });
    const done = describe(chess, user);
    setResult(done);
    setStatus(done ?? "The bot is thinking…");
    return true;
  }

  const rows: { n: number; white: string; black: string }[] = [];
  for (let index = 0; index < sans.length; index += 2) {
    rows.push({ n: index / 2 + 1, white: sans[index] ?? "", black: sans[index + 1] ?? "" });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,640px)_minmax(280px,1fr)]">
      <div>
        <TrainerBoard
          fen={fen}
          orientation={color}
          playerColor={user}
          interactive={!thinking && !result && !error && turn === user}
          lastMove={lastMove}
          boardId="bot"
          onMove={onMove}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Play the bot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {levelIds.map((id) => (
              <Button key={id} variant={level === id ? "default" : "outline"} className="min-h-11" onClick={() => setLevel(id)}>
                {levels[id].label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{levels[level].blurb}</p>
          <label className="flex flex-col gap-1 text-sm">
            Start from
            <select
              className="min-h-11 rounded-lg border border-input bg-background px-3"
              value={startId}
              onChange={(event) => setStartId(event.target.value)}
            >
              {starts.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            {(["white", "black"] as const).map((choice) => (
              <Button
                key={choice}
                variant={color === choice ? "default" : "outline"}
                className="min-h-11 flex-1 capitalize"
                onClick={() => setColor(choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
          <p className="min-h-12">{result ?? (thinking ? `${levels[level].label} is thinking…` : status)}</p>
          {result ? <Badge>{result}</Badge> : null}
          <EngineNote binary={binary} source={source} error={error} />
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={() => begin(startId, color)}>
              New game
            </Button>
            <Button
              className="min-h-11"
              variant="outline"
              disabled={Boolean(result)}
              onClick={() => {
                requestRef.current += 1;
                setResult("You resigned.");
                setStatus("You resigned.");
              }}
            >
              Resign
            </Button>
            {error ? (
              <Button className="min-h-11" variant="outline" onClick={() => setError(null)}>
                Retry
              </Button>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Moves</p>
            <ScrollArea className="h-48 rounded-lg bg-muted/40">
              {rows.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No moves yet.</p>
              ) : (
                <ol className="space-y-1 p-3 text-sm">
                  {rows.map((row) => (
                    <li key={row.n} className="grid grid-cols-[2rem_1fr_1fr] gap-2">
                      <span className="text-muted-foreground">{row.n}.</span>
                      <span>{row.white}</span>
                      <span>{row.black}</span>
                    </li>
                  ))}
                </ol>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
