import type { Metadata } from "next";
import Link from "next/link";
import ConnectionsGame from "@/components/ConnectionsGame";
import { loadConnections } from "@/lib/games";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const { puzzle, error } = await loadConnections();
  return (
    <section className="game-page">
      <Link href="/games" className="back-link">← All games</Link>
      <h1 className="game-title">{puzzle?.title ?? "Connections"}</h1>
      {puzzle && (puzzle.date || puzzle.author) && (
        <p className="game-byline">{[puzzle.date, puzzle.author && `By ${puzzle.author}`].filter(Boolean).join(" · ")}</p>
      )}
      {error ? <div className="game-error">⚠ {error}</div> : <ConnectionsGame key={JSON.stringify(puzzle)} puzzle={puzzle!} />}
    </section>
  );
}
