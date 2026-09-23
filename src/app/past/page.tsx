import type { Metadata } from "next";
import { getArticles } from "@/lib/articles";
import PastArchive from "@/components/PastArchive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Past Articles" };

export default async function PastPage() {
  const articles = await getArticles("past");
  return (
    <section>
      <h1 className="section-heading">Past Articles</h1>
      {articles.length === 0 ? (
        <div className="empty-state">
          <p>
            Nothing in the archive yet. Move finished articles into <code>content/articles/past/</code>.
          </p>
        </div>
      ) : (
        <PastArchive articles={articles} />
      )}
    </section>
  );
}
