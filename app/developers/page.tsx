import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { AlertTriangle, CheckCircle2, Key, Terminal } from "lucide-react";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { buildBreadcrumbListSchema, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Kod API Dokümantasyonu | QR Publish",
  description: "QR Publish REST API ile QR kodlarınızı oluşturun, güncelleyin ve raporlarını kendi sisteminizden alın.",
  path: "/developers",
});

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

function Badge({ label, color }: { label: string; color: "red" | "amber" | "slate" | "violet" }) {
  const cls = {
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  }[color];
  return <code className={`rounded px-1.5 py-0.5 font-mono text-xs ${cls}`}>{label}</code>;
}

export default function DevelopersPage() {
  const origin = getPublicAppOrigin();
  const isHttps = origin.startsWith("https://");

  return (
    <PublicSiteShell
      className="bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100"
      mainClassName="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6"
      headerAction={
        <Link href="/dashboard/settings" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 transition hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20">
          <Key size={15} /> API Ayarları
        </Link>
      }
    >
      <JsonLd data={{
        "@context": "https://schema.org",
        ...buildBreadcrumbListSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "API Dokümantasyonu", path: "/developers" },
        ]),
      }} />
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

        {/* HTTPS Zorunluluğu */}
        {isHttps ? (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="text-sm text-emerald-800 dark:text-emerald-200">
              <p className="font-black">API HTTPS üzerinden sunuluyor</p>
              <p className="mt-0.5 opacity-80">Tüm örneklerdeki URL&apos;ler doğrudan kopyalanabilir.</p>
            </div>
          </div>
        ) : (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-black">API çağrılarında HTTPS kullanın</p>
              <p className="mt-0.5">HTTP ile yapılan istekler <code className="rounded bg-amber-200/60 px-1 font-mono dark:bg-amber-500/20">301</code> yönlendirmesi alır ve POST gövdesi kaybolur. Her zaman <strong>https://</strong> ile başlayan URL kullanın.</p>
            </div>
          </div>
        )}

        {/* Kimlik Doğrulama */}
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
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Alternatif olarak <code className="rounded bg-slate-100 px-1 font-mono dark:bg-white/10">Authorization: Bearer qrk_xxx</code> header&apos;ı da kabul edilir.
          </p>
        </section>

        {/* Endpoint'ler */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Endpoint&apos;ler</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Tüm endpoint&apos;ler <code className="rounded bg-slate-100 px-1.5 font-mono text-xs dark:bg-white/10">{origin}</code> base URL&apos;i ile kullanılır.
          </p>
          <Endpoint method="GET"    path="/api/v1/qrcodes"       desc="Tüm QR kodlarınızı listeler (en fazla 500)." />
          <Endpoint method="POST"   path="/api/v1/qrcodes"       desc="Yeni bir QR kod oluşturur." />
          <Endpoint method="GET"    path="/api/v1/qrcodes/{id}"  desc="Tek bir QR kodun detayını getirir." />
          <Endpoint method="GET"    path="/api/v1/qrcodes/{id}/png" desc="QR kodun PNG görselini döndürür." />
          <Endpoint method="PUT"    path="/api/v1/qrcodes/{id}"  desc="Mevcut bir QR kodu günceller (içerik, URL, başlık, stil…)." />
          <Endpoint method="DELETE" path="/api/v1/qrcodes/{id}"  desc="Bir QR kodu siler (soft delete, slug rezerve kalır)." />
          <Endpoint method="GET"    path="/api/v1/templates"     desc="QR oluştururken kullanabileceğiniz şablonları listeler." />
          <Endpoint method="GET"    path="/api/v1/stats"         desc="Hesap genelinde tarama ve QR istatistikleri." />
          <Endpoint method="GET"    path="/api/v1/reports"       desc="Tarama raporlarını ve özet istatistikleri getirir." />
          <Endpoint method="GET"    path="/api/v1/profile"       desc="Oturumdaki kullanıcı profilini getirir." />
          <Endpoint method="GET"    path="/api/v1/keys"          desc="API anahtarlarınızı listeler." />
          <Endpoint method="POST"   path="/api/v1/keys"          desc="Yeni API anahtarı oluşturur." />
          <Endpoint method="DELETE" path="/api/v1/keys"          desc="Bir API anahtarını iptal eder." />
        </section>

        {/* QR Listeleme */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: QR Kodlarını Listeleme</h2>
          <Code>{`curl "${origin}/api/v1/qrcodes" \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx"`}</Code>
          <p className="mt-4 mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Cevap</p>
          <Code>{`{
  "qrcodes": [
    {
      "id": "5b1f...",
      "title": "Ana Sayfa",
      "short_slug": "anasayfa",
      "target_url": "https://example.com",
      "qr_type": "url",
      "is_active": true,
      "scan_count": 142,
      "png_url": "${origin}/api/v1/qrcodes/5b1f.../png?size=720&v=2026-06-01T09%3A00%3A00.000Z",
      "created_at": "2026-06-01T09:00:00.000Z"
    }
  ],
  "total": 1
}`}</Code>
        </section>

        {/* QR PNG */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: QR PNG İndirme</h2>
          <Code>{`curl -L "${origin}/api/v1/qrcodes/5b1f.../png?size=1024" \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  --output qr.png`}</Code>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            <code className="rounded bg-slate-100 px-1 font-mono dark:bg-white/10">size</code> değeri 128-2048 arasında olabilir.
            İndirme zorlamak için URL&apos;ye <code className="rounded bg-slate-100 px-1 font-mono dark:bg-white/10">download=1</code> ekleyebilirsiniz.
          </p>
        </section>

        {/* Şablon Listeleme */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: Şablonları Listeleme</h2>
          <Code>{`curl "${origin}/api/v1/templates" \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx"`}</Code>
          <p className="mt-4 mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Cevap</p>
          <Code>{`{
  "templates": [
    {
      "id": "9a2b...",
      "name": "Mor Gradient",
      "category": "brand",
      "visibility": "private",
      "scope": "own",
      "config": {
        "dotColor": "#111827",
        "color1": "#7c3aed",
        "color2": "#06b6d4"
      }
    }
  ],
  "total": 1
}`}</Code>
        </section>

        {/* QR Oluşturma */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: QR Oluşturma</h2>
          <Code>{`curl -X POST "${origin}/api/v1/qrcodes" \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Yaz Kampanyası",
    "short_slug": "yaz-kampanya",
    "target_url": "https://example.com/yaz-kampanya",
    "qr_type": "url",
    "template_id": "9a2b..."
  }'`}</Code>
          <p className="mt-4 mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Cevap</p>
          <Code>{`{
  "qrcode": {
    "id": "5b1f...",
    "title": "Yaz Kampanyası",
    "short_slug": "yaz-kampanya",
    "target_url": "https://example.com/yaz-kampanya",
    "qr_type": "url",
    "template_id": "9a2b...",
    "is_active": true,
    "scan_count": 0,
    "png_url": "${origin}/api/v1/qrcodes/5b1f.../png?size=720&v=2026-06-26T12%3A00%3A00.000Z",
    "created_at": "2026-06-26T12:00:00.000Z"
  }
}`}</Code>
        </section>

        {/* QR Güncelleme */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: QR Güncelleme</h2>
          <Code>{`curl -X PUT "${origin}/api/v1/qrcodes/5b1f..." \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://example.com/yeni-hedef",
    "is_active": true
  }'`}</Code>
        </section>

        {/* İstatistikler */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-black">Örnek: İstatistikler</h2>
          <Code>{`curl "${origin}/api/v1/stats" \\
  -H "x-api-key: qrk_xxxxxxxxxxxxxxxxxxxxxxxx"`}</Code>
          <p className="mt-4 mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Cevap</p>
          <Code>{`{
  "total_qrcodes": 24,
  "total_scans": 1830,
  "active_qrcodes": 20,
  "scans_today": 47,
  "scans_this_month": 612
}`}</Code>
        </section>

        {/* Hız Sınırları ve Hatalar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-black">Hız Sınırları ve Hata Kodları</h2>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {[
              { code: "200", color: "violet" as const, desc: "İşlem başarılı." },
              { code: "301", color: "amber" as const, desc: "HTTP → HTTPS yönlendirmesi. URL'yi https:// ile başlatın." },
              { code: "400", color: "amber" as const, desc: "Geçersiz istek gövdesi veya eksik alan." },
              { code: "401", color: "red" as const, desc: "Geçersiz veya iptal edilmiş API anahtarı." },
              { code: "402", color: "amber" as const, desc: "Plan limiti doldu — QR oluşturma reddedildi." },
              { code: "404", color: "slate" as const, desc: "QR kodu bulunamadı veya erişim izniniz yok." },
              { code: "429", color: "amber" as const, desc: "Hız limiti aşıldı. Dakikada sınırlı sayıda istek kabul edilir." },
              { code: "500", color: "red" as const, desc: "Sunucu hatası. Lütfen tekrar deneyin." },
            ].map(({ code, color, desc }) => (
              <div key={code} className="flex items-start gap-3">
                <Badge label={code} color={color} />
                <span>{desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
            Hata yanıtları <code className="font-mono">{`{ "error": "açıklama" }`}</code> formatında döner.
          </div>
        </section>
    </PublicSiteShell>
  );
}
