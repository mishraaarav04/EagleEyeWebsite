import ArticleCard from "@/components/ArticleCard";
import { getArticles } from "@/lib/articles";

// Read the content/ folder on every request so new files show up immediately.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await getArticles("current");

  if (articles.length === 0) {
    return (
      <div className="empty-state">
        <h2>No current articles yet</h2>
        <p>
          Drop <code>.docx</code> files into <code>content/articles/current/</code> and refresh.
        </p>
      </div>
    );
  }

  return (
    <section className="front-page">
      {articles.map((a) => (
        <ArticleCard key={a.slug} article={a} />
      ))}
    </section>
  );
}
