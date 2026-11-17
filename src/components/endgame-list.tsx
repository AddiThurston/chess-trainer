import Link from "next/link";
import { endgames, previewFen } from "@/data/endgames";
import { StaticBoard } from "@/components/static-board";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EndgameList() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-heading text-4xl tracking-tight">A few positions worth knowing cold.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Each card is a legal snapshot of that ending. Open it to play a position drawn from the set, against full-strength Stockfish.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {endgames.map((drill) => (
          <Link key={drill.id} href={`/endgames/${drill.id}`} className="block h-full">
            <Card className="h-full overflow-hidden transition hover:ring-primary/50">
              <div className="p-4 pb-0">
                <StaticBoard fen={previewFen(drill)} orientation={drill.user === "w" ? "white" : "black"} />
              </div>
              <CardHeader>
                <CardTitle className="font-heading text-xl">{drill.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">{drill.goal}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
