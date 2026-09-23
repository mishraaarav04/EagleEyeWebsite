import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";

type Variant = "large" | "medium" | "small" | "list" | "sidebar";

function Byline({ a }: { a: ArticleSummary }) {
  return (
    <div className="card-byline">
      {a.author && <span>By {a.author}</span>}
      {a.date && <span className="card-date">{a.date}</span>}
    </div>
  );
}

function Category({ a }: { a: ArticleSummary }) {
  // Always rendered so every box keeps room for the category, even if blank.
  return <div className="card-category">{a.category || " "}</div>;
}

function Picture({ a, className }: { a: ArticleSummary; className: string }) {
  return (
    <div className={`card-image ${className}`}>
      {a.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className="card-image-empty" aria-hidden>
          EE
        </div>
      )}
    </div>
  );
}

export default function ArticleCard({ article: a, variant }: { article: ArticleSummary; variant?: Variant }) {
  const v: Variant = variant ?? a.size;
  const href = `/articles/${a.slug}`;

  if (v === "large") {
    return (
      <Link href={href} className="card card-large">
        <div className="card-text">
          <Category a={a} />
          <h2 className="card-title">{a.title}</h2>
          {a.excerpt && <p className="card-excerpt">{a.excerpt}</p>}
          <Byline a={a} />
        </div>
        <Picture a={a} className="img-large" />
      </Link>
    );
  }

  if (v === "medium") {
    return (
      <Link href={href} className="card card-medium">
        <Picture a={a} className="img-medium" />
        <Category a={a} />
        <h3 className="card-title">{a.title}</h3>
        <Byline a={a} />
      </Link>
    );
  }

  // small, list and sidebar all use "text left, thumbnail right"
  return (
    <Link href={href} className={`card card-${v}`}>
      <div className="card-text">
        <Category a={a} />
        <h3 className="card-title">{a.title}</h3>
        {v === "list" && a.excerpt && <p className="card-excerpt">{a.excerpt}</p>}
        <Byline a={a} />
      </div>
      <Picture a={a} className="img-thumb" />
    </Link>
  );
}
