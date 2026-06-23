"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export default function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#030712] dark:text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex">
          <BrandLogo priority className="w-[180px]" width={420} height={134} />
        </Link>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">{eyebrow}</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{description}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Son güncelleme: {updatedAt}</p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <h2 className="text-lg font-black sm:text-xl">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 text-sm font-bold text-violet-700 dark:text-violet-300">
            <Link href="/privacy-policy" className="rounded-xl bg-violet-50 px-4 py-2.5 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20">Gizlilik Politikasi</Link>
            <Link href="/terms" className="rounded-xl bg-violet-50 px-4 py-2.5 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20">Kullanim Sartlari</Link>
            <Link href="/cookie-policy" className="rounded-xl bg-violet-50 px-4 py-2.5 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20">Cerez Politikasi</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
