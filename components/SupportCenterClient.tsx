"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileText, LifeBuoy, Loader2, Mail, Search, Upload } from "lucide-react";
import { BRAND_CONTACT_EMAIL } from "@/lib/brand";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";

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

export default function SupportCenterClient() {
  const [query, setQuery] = useState("");
  const [submittedRef, setSubmittedRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const filteredFaqs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return faqs;
    return faqs.filter((item) => `${item.q} ${item.a} ${item.tag}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("kind", "support");
    form.set("message", String(form.get("description") || ""));
    form.delete("description");

    setSubmitting(true);
    setSubmitError("");
    setSubmittedRef("");
    try {
      const response = await fetch("/api/contact", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Destek talebi gönderilemedi.");
      setSubmittedRef(typeof body.reference === "string" ? body.reference : "Gönderildi");
      formElement.reset();
      setAttachmentNames([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Destek talebi gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicSiteShell mainClassName="bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#030712] dark:text-white">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 sm:p-10">
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
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                Bu kart canlı servis ölçümü göstermez. Son manuel durum kaydını, güncelleme zamanını ve bilinen olayları durum sayfasından kontrol edin.
              </div>
              <Link href="/status" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 dark:bg-white dark:text-slate-950">
                <LifeBuoy size={16} /> Durum sayfasını aç
              </Link>
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
              {filteredFaqs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500 dark:border-white/15 dark:text-slate-300">Aramanızla eşleşen yardım içeriği bulunamadı. Aşağıdaki formdan bize ulaşabilirsiniz.</p>
              ) : null}
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
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" role="status">
                <CheckCircle2 className="mr-2 inline h-4 w-4" /> Talebiniz destek ekibine iletildi. Referans: {submittedRef}
              </div>
            ) : null}
            {submitError ? (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
              </div>
            ) : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-300">Ad soyad
                <input name="name" required autoComplete="name" placeholder="Adınız Soyadınız" className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              </label>
              <label className="text-xs font-black text-slate-600 dark:text-slate-300">E-posta
                <input name="email" type="email" required autoComplete="email" placeholder="ornek@sirket.com" className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              </label>
              <label className="text-xs font-black text-slate-600 dark:text-slate-300 sm:col-span-2">Konu
                <input name="subject" required placeholder="Sorununuzu kısa biçimde özetleyin" className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              </label>
              <label className="text-xs font-black text-slate-600 dark:text-slate-300">Kategori
                <select name="category" className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60">
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-600 dark:text-slate-300">Öncelik
                <select name="priority" defaultValue="Normal" className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60">
                  <option>Düşük</option>
                  <option>Normal</option>
                  <option>Yüksek</option>
                  <option>Acil</option>
                </select>
              </label>
              <label className="text-xs font-black text-slate-600 dark:text-slate-300 sm:col-span-2">Açıklama
                <textarea name="description" required minLength={10} placeholder="Ne olduğunu, beklediğiniz sonucu ve varsa hata mesajını yazın." rows={5} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/60" />
              </label>
              <label className="sm:col-span-2 flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500 dark:border-white/15 dark:bg-slate-950/60">
                <span className="flex items-center gap-3"><Upload size={18} /> Dosya veya ekran görüntüsü ekle</span>
                <span className="text-xs font-semibold">En fazla 3 dosya; JPG, PNG, WEBP, PDF veya TXT. Dosya başına 5 MB, toplam 10 MB.</span>
                {attachmentNames.length > 0 ? <span className="text-xs font-black text-violet-700 dark:text-violet-300">Seçilen: {attachmentNames.join(", ")}</span> : null}
                <input
                  type="file"
                  name="attachments"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
                  className="sr-only"
                  onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    const total = files.reduce((sum, file) => sum + file.size, 0);
                    if (files.length > 3 || files.some((file) => file.size > 5 * 1024 * 1024) || total > 10 * 1024 * 1024) {
                      setSubmitError("En fazla 3 dosya seçin; her dosya 5 MB, toplam ek boyutu 10 MB sınırını aşmamalı.");
                      event.currentTarget.value = "";
                      setAttachmentNames([]);
                      return;
                    }
                    setSubmitError("");
                    setAttachmentNames(files.map((file) => file.name));
                  }}
                />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Gönderiliyor...</> : "Talebi Gönder"}
            </button>
          </form>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-lg font-black">Hızlı bağlantılar</h2>
            <div className="mt-4 grid gap-3">
              <a href={`mailto:${BRAND_CONTACT_EMAIL}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><Mail size={18} /> {BRAND_CONTACT_EMAIL}</a>
              <Link href="/contact" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><Mail size={18} /> İletişim sayfası</Link>
              <Link href="/developers" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><FileText size={18} /> Dokümantasyon</Link>
              <Link href="/status" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black hover:text-violet-700 dark:bg-slate-950/50"><LifeBuoy size={18} /> Sistem durumu</Link>
            </div>
          </aside>
        </section>
      </div>
    </PublicSiteShell>
  );
}
