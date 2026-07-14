import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListSchema, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Publish İletişim ve Destek",
  description: "QR Publish ürünleri, hesabınız, faturalama veya iş ortaklığı hakkında ekibimizle iletişime geçin.",
  path: "/contact",
});

export default function ContactPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-[#030712] sm:px-6 sm:py-16"><JsonLd data={{
    "@context": "https://schema.org",
    ...buildBreadcrumbListSchema([
      { name: "Ana Sayfa", path: "/" },
      { name: "İletişim", path: "/contact" },
    ]),
  }} /><div className="mx-auto max-w-5xl">
    <Link href="/" className="text-sm font-black text-violet-600 hover:text-violet-500 dark:text-violet-300">QR Publish ana sayfa</Link>
    <div className="mt-10 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><section>
      <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">İletişim</span>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Size nasıl yardımcı olabiliriz?</h1>
      <p className="mt-5 text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">Ürün, hesap, faturalama veya iş ortaklığı konularında mesaj bırakın. Ekibimiz size e-posta ile döner.</p>
      <a href="mailto:contact@qrpublish.com" className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-black text-slate-800 transition hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-white"><Mail size={19} className="text-violet-600" />contact@qrpublish.com</a>
      <div className="mt-5 space-y-3 text-sm font-semibold text-slate-600 dark:text-slate-300"><p className="flex items-center gap-2"><MessageCircle size={17} className="text-violet-600" />Mesajınız doğrudan destek ekibine gider.</p><p className="flex items-center gap-2"><ShieldCheck size={17} className="text-violet-600" />Bilgileriniz yalnızca talebinizi yanıtlamak için kullanılır.</p></div>
    </section><ContactForm /></div>
  </div></main>;
}
