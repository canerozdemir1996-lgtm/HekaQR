import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { ArrowLeft, Key, Terminal } from "lucide-react";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

export const metadata: Metadata = {
  title: "API Dokümantasyonu",
  description: "QR Publish REST API ile QR kodlarınızı kendi sisteminizden oluşturun, güncelleyin ve raporlarını alın.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    POST: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    PUT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 py-3 dark:border-white/10 last:border-0">
      <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${colors[method]}`}>{method}</span>
      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{path}</span>
      <span className="text-sm text-slate-500 dark:text-slate-400">{desc}</span>
    </div>
  );
}

export default function DevelopersPage() {
  const origin = getPublicAppOrigin();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 dark:border-white/10 dark:bg-[#020617]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo className="w-[150px]" width={420} height={134} />
          </Link>
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-300">
            <ArrowLeft size={15} /> Ayarlara dön
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <Terminal size={22} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">Geliştirici</p>
            <h1 className="text-3xl font-black tracking-tight">REST API Dokümantasyonu</h1>
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          QR Publish API&apos;si, QR kodlarınızı kendi sisteminizden (ERP, CRM, otomasyon aracınız) oluşturmanıza,
          güncellemenize, listelemenize ve silmenize olanak verir. API erişimi aktif bir <strong>Pro</strong> pakete
          dahildir.
        </p>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center gap-2">
            <Key size={18} className="text-violet-600 dark:text-violet-300" />
            <h2 className="text-lg font-black">Kimlik Doğrulama</h2>
          </div>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Her isteğe <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">x-api-key</code> header&apos;ı
            ile API anahtarınızı ekleyin. Anahtarınızı{" "}
            <Link href="/dashboard/settings" className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-300">Ayarlar</Link> sayfasından
            oluşturabilirsiniz — anahtar sadece oluşturulduğu anda gösterilir, sonradan tekrar görüntülenemez.
          </p>
          <Code>{`curl ${origin}/api/v1/qrcodes \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx"`}</Code>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Endpoint&apos;ler</h2>
          <Endpoint method="GET" path="/api/v1/qrcodes" desc="Tüm QR kodlarınızı listeler (en fazla 500)." />
          <Endpoint method="POST" path="/api/v1/qrcodes" desc="Yeni bir QR kod oluşturur." />
          <Endpoint method="GET" path="/api/v1/qrcodes/{id}" desc="Tek bir QR kodun detayını getirir." />
          <Endpoint method="PUT" path="/api/v1/qrcodes/{id}" desc="Mevcut bir QR kodu günceller." />
          <Endpoint method="DELETE" path="/api/v1/qrcodes/{id}" desc="Bir QR kodu siler." />
          <Endpoint method="GET" path="/api/v1/reports" desc="Tarama raporlarını ve özet istatistikleri getirir." />
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: QR Oluşturma</h2>
          <Code>{`curl -X POST ${origin}/api/v1/qrcodes \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Yaz Kampanyası",
    "short_slug": "yaz-kampanya",
    "target_url": "https://example.com/yaz-kampanya",
    "qr_type": "url"
  }'`}</Code>
          <p className="mt-4 mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Cevap</p>
          <Code>{`{
  "qrcode": {
    "id": "5b1f...",
    "title": "Yaz Kampanyası",
    "short_slug": "yaz-kampanya",
    "target_url": "https://example.com/yaz-kampanya",
    "qr_type": "url",
    "is_active": true,
    "scan_count": 0,
    "created_at": "2026-06-25T12:00:00.000Z"
  }
}`}</Code>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Hız Sınırları ve Hatalar</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>QR oluşturma uç noktası dakikada sınırlı sayıda istek kabul eder; aşıldığında <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">429</code> döner.</li>
            <li>Geçersiz veya iptal edilmiş anahtarlar <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">401</code> ile reddedilir.</li>
            <li>Plan limitiniz dolduğunda QR oluşturma <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">402</code> ile reddedilir.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
