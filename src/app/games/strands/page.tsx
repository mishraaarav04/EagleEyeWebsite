import type { Metadata } from "next";
import Link from "next/link";
import StrandsGame from "@/components/StrandsGame";
import { loadStrands } from "@/lib/games";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Strands" };

export default async function StrandsPage() {
  const { puzzle, error } = await loadStrands();
  return (
    <section className="game-page">
      <Link href="/games" className="back-link">← All games</Link>
      <h1 className="game-title">{puzzle?.title ?? "Strands"}</h1>
      {puzzle && (puzzle.date || puzzle.author) && (
        <p className="game-byline">{[puzzle.date, puzzle.author && `By ${puzzle.author}`].filter(Boolean).join(" · ")}</p>
      )}
      {error ? <div className="game-error">⚠ {error}</div> : <StrandsGame key={JSON.stringify(puzzle!.grid)} puzzle={puzzle!} />}
    </section>
  );
}
