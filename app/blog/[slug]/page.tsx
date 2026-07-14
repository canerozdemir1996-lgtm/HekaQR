import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { JsonLd } from "@/components/JsonLd";
import { blogPosts, getBlogPost, getRelatedBlogPosts } from "@/lib/blog-posts";
import { buildBreadcrumbListSchema, buildFaqPageSchema, buildPageMetadata, getCanonicalUrl } from "@/lib/seo";

export function generateStaticParams() { return blogPosts.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  const base = buildPageMetadata({ title: post.title, description: post.description, path: `/blog/${post.slug}` });
  return { ...base, keywords: post.keywords, openGraph: { ...base.openGraph, type: "article", publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: ["QR Publish Editör Ekibi"] } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  const related = getRelatedBlogPosts(post);
  const path = `/blog/${post.slug}`;
  return <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#030712] dark:text-white">
    <JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: post.title, description: post.description, datePublished: post.publishedAt, dateModified: post.updatedAt, mainEntityOfPage: getCanonicalUrl(path), author: { "@type": "Organization", name: "QR Publish" }, publisher: { "@type": "Organization", name: "QR Publish", logo: { "@type": "ImageObject", url: getCanonicalUrl("/brand/qr-publish-logo.png") } } }, buildBreadcrumbListSchema([{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path }]), buildFaqPageSchema(post.faq)] }} />
    <header className="border-b border-slate-200 bg-white/90 dark:border-white/10 dark:bg-slate-950/80"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6"><Link href="/"><BrandLogo className="w-[150px]" /></Link><Link href="/blog" className="text-sm font-black text-violet-600">← Tüm yazılar</Link></div></header>
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20"><nav aria-label="Sayfa yolu" className="text-sm font-bold text-slate-500"><Link href="/">Ana Sayfa</Link> / <Link href="/blog">Blog</Link> / <span>{post.category}</span></nav><p className="mt-10 text-sm font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">{post.category}</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">{post.title}</h1><p className="mt-6 text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">{post.excerpt}</p><div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-500"><span>QR Publish Editör Ekibi</span><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${post.publishedAt}T00:00:00Z`))}</time><span>{post.readingMinutes} dakika okuma</span></div>
      <div className="mt-14 space-y-14">{post.sections.map((section) => <section key={section.heading}><h2 className="text-3xl font-black tracking-tight">{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-5 text-base font-medium leading-8 text-slate-700 dark:text-slate-200">{paragraph}</p>)}{section.bullets ? <ul className="mt-5 space-y-3 pl-6 text-base font-semibold leading-7 text-slate-700 marker:text-violet-600 dark:text-slate-200">{section.bullets.map((item) => <li className="list-disc" key={item}>{item}</li>)}</ul> : null}</section>)}</div>
      <section className="mt-16 rounded-3xl border border-violet-200 bg-violet-50 p-7 dark:border-violet-500/20 dark:bg-violet-500/10"><h2 className="text-2xl font-black">İlgili QR Publish çözümleri</h2><div className="mt-5 flex flex-wrap gap-3">{post.relatedPaths.map((item) => <Link key={item.path} href={item.path} className="rounded-full bg-white px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200">{item.label}</Link>)}</div></section>
      <section className="mt-16"><h2 className="text-3xl font-black">Sık sorulan sorular</h2><div className="mt-6 space-y-4">{post.faq.map((item) => <details key={item.question} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"><summary className="cursor-pointer font-black">{item.question}</summary><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p></details>)}</div></section>
    </article>
    <aside className="border-t border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-white/[0.03]"><div className="mx-auto max-w-5xl px-4 sm:px-6"><h2 className="text-3xl font-black">Okumaya devam edin</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{related.map((item) => <Link key={item.slug} href={`/blog/${item.slug}`} className="rounded-2xl border border-slate-200 p-5 font-black hover:border-violet-300 dark:border-white/10">{item.title}</Link>)}</div></div></aside>
  </main>;
}
