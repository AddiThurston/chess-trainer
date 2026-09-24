import { notFound } from "next/navigation";
import { OpeningSprint } from "@/components/opening-sprint";
import { getOpening, openings } from "@/data/openings";

export function generateStaticParams() {
  return openings.map((opening) => ({ slug: opening.id }));
}

export default async function OpeningLinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ line?: string; color?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const opening = getOpening(slug);
  if (!opening) notFound();
  const lineId = typeof query.line === "string" ? query.line : opening.lines[0]?.id ?? "";
  const color = query.color === "black" ? "black" : "white";
  return <OpeningSprint key={`${lineId}:${color}`} openingId={slug} lineId={lineId} color={color} />;
}
