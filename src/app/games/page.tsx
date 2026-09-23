import type { Metadata } from "next";
import Link from "next/link";
import { loadConnections, loadStrands } from "@/lib/games";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Games" };

export default async function GamesPage() {
  const [conn, strands] = await Promise.all([loadConnections(), loadStrands()]);
  return (
    <section>
      <h1 className="section-heading">Games</h1>
      <div className="games-hub">
        <Link href="/games/connections" className="game-card game-card-connections">
          <div className="game-icon conn-icon" aria-hidden>
            <span /><span /><span /><span />
          </div>
          <h2>{conn.puzzle?.title ?? "Connections"}</h2>
          <p>Group words that share a common thread.</p>
          <div className="game-meta">
            {[conn.puzzle?.date, conn.puzzle?.author && `By ${conn.puzzle.author}`].filter(Boolean).join(" · ") || " "}
          </div>
          <span className="pill primary">Play</span>
        </Link>
        <Link href="/games/strands" className="game-card game-card-strands">
          <div className="game-icon strands-icon" aria-hidden>
            {"STRAND".split("").map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <h2>{strands.puzzle?.title ?? "Strands"}</h2>
          <p>Find hidden words and uncover the day’s theme.</p>
          <div className="game-meta">
            {[strands.puzzle?.date, strands.puzzle?.author && `By ${strands.puzzle.author}`].filter(Boolean).join(" · ") ||
              " "}
          </div>
          <span className="pill primary">Play</span>
        </Link>
      </div>
    </section>
  );
}
