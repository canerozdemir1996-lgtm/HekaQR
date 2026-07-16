"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Github, LifeBuoy, Mail, Search, Upload, Wifi } from "lucide-react";
import { BRAND_CONTACT_EMAIL } from "@/lib/brand";

const categories = [
  "QR Kodlar",
  "Menü Sistemi",
  "Dijital Kartvizit",
  "Rezervasyon",
  "Geri Bildirim",
  "Sınav Sistemi",
  "Kupon Sistemi",
  "Abonelik",
  "API",
  "Hesap",
];

const faqs = [
  { q: "Dinamik QR hedefini sonradan değiştirebilir miyim?", a: "Evet. Desteklenen QR türlerinde içerik ve hedef bağlantıyı panelden güncelleyebilirsiniz.", tag: "QR Kodlar" },
  { q: "Menü QR siparişleri hangi panelde görünür?", a: "Siparişler menüsünde tarih, masa, durum ve ürün bazlı olarak takip edilir.", tag: "Menü Sistemi" },
  { q: "Tarama raporları hangi verileri gösterir?", a: "Toplam/tekil tarama, cihaz, tarayıcı, ülke, şehir ve dönem bazlı performans metrikleri sunulur.", tag: "Raporlama" },
  { q: "Abonelik faturalarımı nereden indirebilirim?", a: "Profil ve Faturalar ekranında plan, ödeme geçmişi ve fatura bağlantıları listelenir.", tag: "Abonelik" },
  { q: "API kullanımı için anahtar gerekiyor mu?", a: "Evet. API anahtarları panelde oluşturulur ve plan limitlerine göre çalışır.", tag: "API" },
];

const statusItems = ["API", "Dashboard", "QR Redirect", "Payments", "Mail"];

export default function SupportCenterClient() {
  const [query, setQuery] = useState("");
  const [submittedRef, setSubmittedRef] = useState("");
  const filteredFaqs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return faqs;
    return faqs.filter((item) => `${item.q} ${item.a} ${item.tag}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ref = `SUP-${Date.now().toString(36).toUpperCase()}`;
    const subject = String(form.get("subject") || "QR Publish destek talebi");
    const body = [
      `Talep No: ${ref}`,
      `Kategori: ${form.get("category") || "-"}`,
      `Öncelik: ${form.get("priority") || "-"}`,
      `İletişim: ${form.get("contact") || "-"}`,
      "",
      String(form.get("description") || ""),
    ].join("\n");
    setSubmittedRef(ref);
    window.location.href = `mailto:${BRAND_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#030712] dark:text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex text-sm font-black text-violet-700 dark:text-violet-300">← QR Publish</Link>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">Yardım Merkezi</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">QR Publish destek merkezi</h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
                QR kodlar, menü siparişleri, rezervasyon, geri bildirim, kupon, sınav, abonelik ve API konularında hızlı yanıt alın.
              </p>
              <label className="mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 focus-within:border-violet-400 dark:border-white/10 dark:bg-slate-950/60">
                <Search size={18} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Yardım merkezinde ara..." className="min-w-0 flex-1 bg-transparent outline-none" />
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-slate-950/50">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Sistem Durumu</h2>
              <div className="mt-4 grid gap-3">
                {statusItems.map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black shadow-sm dark:bg-white/[0.05]">
                    <span>{item}</span>
                    <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-300"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Çalışıyor</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-lg font-black">Kategoriler</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setQuery(category)} className="rounded-2xl border border-slate-200 px-3 py-3 text-left text-sm font-bold hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:hover:border-violet-400">
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-lg font-black">Popüler sorular</h2>
            <div className="mt-4 space-y-3">
              {filteredFaqs.map((item) => (
                <article key={item.q} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-sm font-black">{item.q}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-lg font-black">Destek talebi oluştur</h2>
            {submittedRef ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="mr-2 inline h-4 w-4" /> Talep referansınız: {submittedRef}
              </div>
            ) : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input name="subject" required placeholder="Konu" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              <select name="category" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60">
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select name="priority" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60">
                <option>Düşük</option>
                <option>Normal</option>
                <option>Yüksek</option>
                <option>Acil</option>
              </select>
              <input name="contact" type="email" required placeholder="E-posta adresiniz" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              <textarea name="description" required placeholder="Açıklama" rows={5} className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500 dark:border-white/15 dark:bg-slate-950/60">
                <Upload size={18} /> Dosya veya ekran görüntüsü ekleme alanı
                <input type="file" multiple className="sr-only" />
              </label>
            </div>
            <button className="mt-5 rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500">Talebi Gönder</button>
          </form>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-lg font-black">Hızlı bağlantılar</h2>
            <div className="mt-4 grid gap-3">
              <a href={`mailto:${BRAND_CONTACT_EMAIL}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><Mail size={18} /> {BRAND_CONTACT_EMAIL}</a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><Wifi size={18} /> WhatsApp destek hattı</a>
              <Link href="/developers" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><FileText size={18} /> Dokümantasyon</Link>
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><Github size={18} /> GitHub / API notları</a>
              <Link href="/status" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><LifeBuoy size={18} /> Sistem durumu</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
