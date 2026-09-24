import Link from "next/link";
import { endgames } from "@/data/endgames";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EndgameList() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="text-sm tracking-wide text-primary uppercase">Endgames</p>
      <h1 className="mt-1 font-heading text-4xl tracking-tight">A few positions worth knowing cold.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        You play the side that should reach the goal. The other side answers with Stockfish when it is installed, and with a small built-in policy when it is not.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {endgames.map((drill) => (
          <Link key={drill.id} href={`/endgames/${drill.id}`} className="block h-full">
            <Card className="h-full transition hover:ring-primary/50">
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
