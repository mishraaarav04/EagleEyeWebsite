// Serves pictures that are embedded inside the .docx article files.
// URL: /api/images/<article-slug>/<n>   (n = 0 for the first picture)
import { getArticleImage } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; index: string }> }
) {
  const { slug, index } = await params;
  const image = await getArticleImage(slug, Number(index));
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
