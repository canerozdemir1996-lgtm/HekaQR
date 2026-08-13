import { blogPosts } from "@/lib/blog-posts";
import { getCanonicalUrl } from "@/lib/seo";

function escapeXml(value: string) { return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[char] ?? char); }

export function GET() {
  const items = blogPosts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${getCanonicalUrl(`/blog/${post.slug}`)}</link><guid>${getCanonicalUrl(`/blog/${post.slug}`)}</guid><description>${escapeXml(post.description)}</description><pubDate>${new Date(`${post.publishedAt}T00:00:00Z`).toUTCString()}</pubDate></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>QR Publish Blog</title><link>${getCanonicalUrl("/blog")}</link><description>QR kod rehberleri, kullanım önerileri ve analiz ipuçları.</description><language>tr-TR</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
