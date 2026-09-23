import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/ArticleCard";
import { getArticle, getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  return { title: a?.title ?? "Article not found" };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const [current, past] = await Promise.all([getArticles("current"), getArticles("past")]);
  const more = current.filter((a) => a.slug !== slug).slice(0, 6);
  const archive = past.filter((a) => a.slug !== slug).slice(0, 4);

  return (
    <div className="article-layout">
      <article className="article">
        <header className="article-header">
          <div className="article-kicker">
            <Link href={article.section === "past" ? "/past" : "/"}>
              {article.section === "past" ? "Past Articles" : "Current"}
            </Link>
            {article.category && <span> · {article.category}</span>}
          </div>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-byline">
            {article.author && (
              <span className="article-author">By {article.author}</span>
            )}
            {article.date && <span className="article-date">{article.date}</span>}
            {article.extraInfo.map((x) => (
              <span key={x} className="article-extra">
                {x}
              </span>
            ))}
          </div>
        </header>
        <div className="article-body" dangerouslySetInnerHTML={{ __html: article.html }} />
      </article>

      <aside className="sidebar">
        {more.length > 0 && (
          <>
            <h2 className="sidebar-heading">More from The Eagle Eye</h2>
            {more.map((a) => (
              <ArticleCard key={a.slug} article={a} variant="sidebar" />
            ))}
          </>
        )}
        {archive.length > 0 && (
          <>
            <h2 className="sidebar-heading">From the Archive</h2>
            {archive.map((a) => (
              <ArticleCard key={a.slug} article={a} variant="sidebar" />
            ))}
          </>
        )}
        <Link href="/games" className="sidebar-games">
          <span className="sidebar-games-title">Play today’s games</span>
          <span>Connections · Strands →</span>
        </Link>
      </aside>
    </div>
  );
}
