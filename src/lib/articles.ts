// ============================================================================
// articles.ts — reads Word (.docx) articles straight from the content/ folder.
//
//   content/articles/current/*.docx  -> "Current" tab (home page)
//   content/articles/past/*.docx     -> "Past Articles" tab
//
// Rules for each .docx file:
//   • Line 1 = title
//   • Line 2 = author and supporting info, separated by "|"
//       e.g.  By Jane Doe | September 22, 2026 | Opinion
//     (the last non-date piece is used as the category)
//   • Everything after that = the article body. Pictures pasted into the
//     Word doc are kept; the FIRST picture becomes the home-page thumbnail.
//   • The file NAME decides the home-page box size: include "large",
//     "medium" or "small" anywhere in it (e.g. "dining-hall-review-large.docx").
//     No size word -> medium.
//   • Optional: start the file name with a number ("01-...") to pin order.
//     Numbered files come first (lowest number first); the rest are sorted
//     newest date first.
//
// Nothing is cached across file changes: every file is re-read whenever its
// modified time changes, so dropping in / replacing a file updates the site.
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { parse, HTMLElement, NodeType } from "node-html-parser";

export type Section = "current" | "past";
export type BoxSize = "large" | "medium" | "small";

export interface ArticleImage {
  buffer: Buffer;
  contentType: string;
}

export interface ArticleSummary {
  slug: string;
  section: Section;
  fileName: string;
  size: BoxSize;
  title: string;
  author: string;
  date: string | null; // as written in the file
  dateValue: number; // for sorting (falls back to file modified time)
  category: string;
  extraInfo: string[]; // any other pieces on line 2
  excerpt: string;
  imageUrl: string | null; // first picture in the doc
  imageCount: number;
  order: number | null; // numeric filename prefix, if any
}

export interface Article extends ArticleSummary {
  html: string; // body HTML (title + line 2 removed)
}

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");
const SECTIONS: Section[] = ["current", "past"];

// ---------------------------------------------------------------------------
// File name helpers
// ---------------------------------------------------------------------------
export function sizeFromFileName(fileName: string): BoxSize {
  const base = fileName.toLowerCase();
  // match size words that aren't glued inside another word (so "smallville" ≠ small)
  const m = base.match(/(?:^|[^a-z])(large|medium|small)(?=[^a-z]|$)/);
  if (m) return m[1] as BoxSize;
  // looser fallback: the word appears anywhere
  if (base.includes("large")) return "large";
  if (base.includes("small")) return "small";
  return "medium";
}

function orderFromFileName(fileName: string): number | null {
  const m = fileName.match(/^(\d+)[\s_.-]/);
  return m ? parseInt(m[1], 10) : null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.docx$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isArticleFile(name: string): boolean {
  // ignore Word's temporary lock files ("~$My Article.docx") and dotfiles
  return /\.docx$/i.test(name) && !name.startsWith("~$") && !name.startsWith(".");
}

// ---------------------------------------------------------------------------
// Line-2 parsing:  "By Jane Doe | Sept 22, 2026 | Opinion"
// ---------------------------------------------------------------------------
function looksLikeDate(s: string): boolean {
  if (!/\d/.test(s)) return false;
  return !Number.isNaN(Date.parse(s.replace(/(\d)(st|nd|rd|th)\b/g, "$1")));
}

function parseInfoLine(line: string) {
  const parts = line
    .split(/\s*[|•·]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let author = "";
  let date: string | null = null;
  let category = "";
  const extra: string[] = [];

  parts.forEach((p, i) => {
    if (i === 0) {
      author = p.replace(/^by[:\s]+/i, "").trim();
      return;
    }
    if (!date && looksLikeDate(p)) {
      date = p;
      return;
    }
    extra.push(p);
  });

  // category = last leftover piece; anything else stays as extra info
  if (extra.length > 0) category = extra.pop()!;

  return { author, date, category, extra };
}

// ---------------------------------------------------------------------------
// .docx -> Article
// ---------------------------------------------------------------------------
interface Parsed {
  article: Article;
  images: ArticleImage[];
}

const cache = new Map<string, { mtimeMs: number; parsed: Parsed }>();

async function parseDocx(section: Section, fileName: string, slug: string): Promise<Parsed> {
  const filePath = path.join(CONTENT_DIR, section, fileName);
  const stat = await fs.stat(filePath);
  const hit = cache.get(filePath);
  if (hit && hit.mtimeMs === stat.mtimeMs && hit.parsed.article.slug === slug) return hit.parsed;

  const images: ArticleImage[] = [];
  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.readAsBuffer();
        const index = images.length;
        images.push({ buffer, contentType: image.contentType || "image/png" });
        return { src: `/api/images/${slug}/${index}` };
      }),
    }
  );

  const root = parse(result.value);
  const blocks = root.childNodes.filter((n): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE);

  // Title = first block with text, info = second block with text.
  const textBlocks = blocks.filter((b) => b.text.trim().length > 0);
  const titleEl = textBlocks[0];
  const infoEl = textBlocks[1];
  const title = titleEl?.text.trim() || fileName.replace(/\.docx$/i, "");
  const infoLine = infoEl?.text.trim() || "";
  // Only strip the title/info paragraphs' text — keep any picture that was
  // pasted onto the same line in Word.
  for (const el of [titleEl, infoEl]) {
    if (!el) continue;
    const imgs = el.querySelectorAll("img");
    if (imgs.length) el.replaceWith(parse(imgs.map((i) => `<p>${i.toString()}</p>`).join("")));
    else el.remove();
  }

  // drop empty paragraphs Word likes to leave behind
  root.querySelectorAll("p").forEach((p) => {
    if (!p.text.trim() && !p.querySelector("img")) p.remove();
  });
  // lazy-load pictures in the body
  root.querySelectorAll("img").forEach((img) => img.setAttribute("loading", "lazy"));

  const info = parseInfoLine(infoLine);
  const firstPara = root.querySelectorAll("p").find((p) => p.text.trim().length > 40);
  const excerptRaw = firstPara?.text.trim() ?? "";
  const excerpt = excerptRaw.length > 220 ? excerptRaw.slice(0, 217).replace(/\s+\S*$/, "") + "…" : excerptRaw;

  const parsedDate = info.date ? Date.parse(String(info.date).replace(/(\d)(st|nd|rd|th)\b/g, "$1")) : NaN;

  const article: Article = {
    slug,
    section,
    fileName,
    size: sizeFromFileName(fileName),
    title,
    author: info.author,
    date: info.date,
    dateValue: Number.isNaN(parsedDate) ? stat.mtimeMs : parsedDate,
    category: info.category,
    extraInfo: info.extra,
    excerpt,
    imageUrl: images.length ? `/api/images/${slug}/0` : null,
    imageCount: images.length,
    order: orderFromFileName(fileName),
    html: root.toString(),
  };

  const parsed = { article, images };
  cache.set(filePath, { mtimeMs: stat.mtimeMs, parsed });
  return parsed;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
interface FileEntry {
  section: Section;
  fileName: string;
  slug: string;
}

async function listFiles(): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  const used = new Set<string>();
  for (const section of SECTIONS) {
    let names: string[] = [];
    try {
      names = await fs.readdir(path.join(CONTENT_DIR, section));
    } catch {
      continue; // folder missing -> just no articles there
    }
    for (const fileName of names.filter(isArticleFile).sort()) {
      let slug = slugify(fileName) || "article";
      // same file name in both folders? keep URLs unique
      if (used.has(slug)) slug = `${section}-${slug}`;
      used.add(slug);
      entries.push({ section, fileName, slug });
    }
  }
  return entries;
}

function sortArticles<T extends ArticleSummary>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return b.dateValue - a.dateValue;
  });
}

function toSummary(a: Article): ArticleSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { html, ...summary } = a;
  return summary;
}

export async function getArticles(section?: Section): Promise<ArticleSummary[]> {
  const files = (await listFiles()).filter((f) => !section || f.section === section);
  const parsed = await Promise.all(
    files.map(async (f) => {
      try {
        return (await parseDocx(f.section, f.fileName, f.slug)).article;
      } catch (err) {
        console.error(`[eagle-eye] Could not read ${f.section}/${f.fileName}:`, err);
        return null;
      }
    })
  );
  return sortArticles(parsed.filter((a): a is Article => a !== null).map(toSummary));
}

async function findFile(slug: string): Promise<FileEntry | undefined> {
  return (await listFiles()).find((f) => f.slug === slug);
}

export async function getArticle(slug: string): Promise<Article | null> {
  const file = await findFile(slug);
  if (!file) return null;
  return (await parseDocx(file.section, file.fileName, file.slug)).article;
}

export async function getArticleImage(slug: string, index: number): Promise<ArticleImage | null> {
  const file = await findFile(slug);
  if (!file) return null;
  const { images } = await parseDocx(file.section, file.fileName, file.slug);
  return images[index] ?? null;
}
