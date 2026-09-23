"use client";

import { useMemo, useState } from "react";
import ArticleCard from "./ArticleCard";
import type { ArticleSummary } from "@/lib/articles";

export default function PastArchive({ articles }: { articles: ArticleSummary[] }) {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort()],
    [articles]
  );

  const shown = articles.filter((a) => {
    if (category !== "All" && a.category !== category) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [a.title, a.author, a.category, a.excerpt].some((s) => s.toLowerCase().includes(q));
  });

  return (
    <>
      <div className="archive-controls">
        <div className="chips">
          {categories.map((c) => (
            <button key={c} className={c === category ? "chip active" : "chip"} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <input
          className="archive-search"
          type="search"
          placeholder="Search the archive"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="archive-list">
        {shown.map((a) => (
          <ArticleCard key={a.slug} article={a} variant="list" />
        ))}
        {shown.length === 0 && <p className="muted">No articles match.</p>}
      </div>
    </>
  );
}
