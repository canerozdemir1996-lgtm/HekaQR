import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { JsonLd } from "@/components/JsonLd";
import { blogPosts } from "@/lib/blog-posts";
import { buildBreadcrumbListSchema, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Kod Rehberleri ve İpuçları | QR Publish Blog",
  description: "QR kod oluşturma, dinamik QR, restoran menüsü, dijital kartvizit, baskı ve tarama analizi hakkında uygulamalı Türkçe rehberler.",
  path: "/blog",
});

export default function BlogPage() {
  return <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#030712] dark:text-white">
    <JsonLd data={{ "@context": "https://schema.org", ...buildBreadcrumbListSchema([{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }]) }} />
    <header className="border-b border-slate-200 bg-white/90 dark:border-white/10 dark:bg-slate-950/80"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6"><Link href="/"><BrandLogo className="w-[150px]" /></Link><nav className="flex gap-5 text-sm font-bold"><Link href="/qr-kod-olusturucu" className="hover:text-violet-600">QR Oluştur</Link><Link href="/pricing" className="hover:text-violet-600">Fiyatlar</Link><Link href="/blog/rss.xml" className="hover:text-violet-600">RSS</Link></nav></div></header>
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24"><p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">QR Publish Blog</p><h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">QR kodları daha etkili kullanmak için pratik rehberler</h1><p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">Teknik ayrıntıları sadeleştiren, güvenilir baskıdan kampanya ölçümüne kadar gerçek kullanım kararlarını destekleyen içerikler.</p></section>
    <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 sm:px-6 md:grid-cols-2 lg:grid-cols-3">{blogPosts.map((post) => <article key={post.slug} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"><p className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">{post.category}</p><h2 className="mt-4 text-xl font-black leading-7"><Link href={`/blog/${post.slug}`} className="hover:text-violet-600">{post.title}</Link></h2><p className="mt-4 flex-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{post.excerpt}</p><div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-500"><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${post.publishedAt}T00:00:00Z`))}</time><span>{post.readingMinutes} dk</span></div><Link href={`/blog/${post.slug}`} className="mt-5 font-black text-violet-600 dark:text-violet-300">Rehberi oku →</Link></article>)}</section>
  </main>;
}
