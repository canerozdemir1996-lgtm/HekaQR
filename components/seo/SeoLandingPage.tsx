import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import type { SeoLandingPageConfig } from "@/lib/seo-landing-pages";
import { blogPosts } from "@/lib/blog-posts";
import { buildBreadcrumbListSchema, buildFaqPageSchema, buildSoftwareApplicationSchema } from "@/lib/seo";

type SeoLandingPageProps = {
  page: SeoLandingPageConfig;
  relatedPages: SeoLandingPageConfig[];
  path?: string;
};

export function SeoLandingPage({ page, relatedPages, path = `/${page.slug}` }: SeoLandingPageProps) {
  const relatedGuides = blogPosts.filter((post) => post.relatedPaths.some((link) => link.path === path)).slice(0, 3);

  return (
    <PublicSiteShell className="bg-slate-50 text-slate-950 dark:bg-[#050713] dark:text-white">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            buildSoftwareApplicationSchema({ description: page.intro }),
            buildFaqPageSchema(page.faqs),
            buildBreadcrumbListSchema([
              { name: "Ana Sayfa", path: "/" },
              { name: page.eyebrow, path },
            ]),
          ],
        }}
      />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-12">
        <nav aria-label="Sayfa yolu" className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-300">Ana Sayfa</Link>
          <span aria-hidden="true"> / </span>
          <span>{page.eyebrow}</span>
        </nav>

        <div className="mt-12 max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{page.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{page.h1}</h1>
          <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">{page.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 text-sm font-black text-white transition hover:bg-violet-500">
              Ücretsiz Başla <ArrowRight size={17} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
              Fiyatları İncele
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-white/[0.03] md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">QR Publish ile neler yapabilirsiniz?</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.benefits.map((benefit) => (
              <article key={benefit} className="rounded-3xl border border-slate-200 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={23} />
                <p className="mt-5 text-base font-bold leading-7 text-slate-700 dark:text-slate-200">{benefit}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Nasıl çalışır?</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {page.steps.map((step, index) => (
            <li key={step} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-3xl font-black text-violet-600 dark:text-violet-300">0{index + 1}</p>
              <p className="mt-5 text-base font-bold leading-7 text-slate-700 dark:text-slate-200">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-white/[0.03] md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Sık sorulan sorular</h2>
          <div className="mt-10 space-y-4">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="rounded-3xl border border-slate-200 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <h3 className="text-lg font-black">{faq.question}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {relatedPages.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">İlgili QR çözümleri</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {relatedPages.map((related) => (
              <Link key={related.slug} href={`/${related.slug}`} className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{related.eyebrow}</p>
                <p className="mt-4 text-xl font-black">{related.h1}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet-600 dark:text-violet-300">İncele <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedGuides.length > 0 ? (
        <section className="border-t border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-white/[0.03] md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Konuyla ilgili rehberler</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {relatedGuides.map((guide) => (
                <Link key={guide.slug} href={`/blog/${guide.slug}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{guide.category}</p>
                  <h3 className="mt-4 text-xl font-black leading-7">{guide.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{guide.excerpt}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet-600 dark:text-violet-300">Rehberi oku <ArrowRight size={16} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PublicSiteShell>
  );
}
