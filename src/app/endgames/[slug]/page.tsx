import { notFound } from "next/navigation";
import { EndgameDrill } from "@/components/endgame-drill";
import { endgames, getEndgame } from "@/data/endgames";

export function generateStaticParams() {
  return endgames.map((endgame) => ({ slug: endgame.id }));
}

export default async function EndgamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const drill = getEndgame(slug);
  if (!drill) notFound();
  return <EndgameDrill drill={drill} />;
}
