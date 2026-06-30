import Link from "next/link";
import { ArrowLeft, CheckCircle2, Globe2, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Ozel Alan Adi Kurulumu",
};

const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
const subtle = "text-slate-500 dark:text-slate-400";
const code = "rounded-lg bg-slate-100 px-2 py-1 font-mono text-[13px] dark:bg-white/10";

function Step({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <div className={`${panel} p-5`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
          {no}
        </div>
        <h2 className="font-black">{title}</h2>
      </div>
      <div className={`space-y-3 text-sm leading-relaxed ${subtle}`}>{children}</div>
    </div>
  );
}

export default function CustomDomainHelpPage() {
  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:underline dark:text-violet-300"
        >
          <ArrowLeft size={16} />
          Ayarlara geri don
        </Link>

        <header className="mb-6 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <Globe2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Ozel alan adi nasil kurulur?</h1>
            <p className={`mt-1 text-sm ${subtle}`}>
              QR linklerinizin kendi alan adinizdan (orn. q.firmaniz.com) acilmasi icin 3 adim: DNS sahiplik dogrulamasi,
              yonlendirme kaydi ve otomatik SSL kurulumu.
            </p>
          </div>
        </header>

        <div className="space-y-4">
          <Step no={1} title="Ayarlar sayfasinda alan adinizi girin">
            <p>
              <Link href="/dashboard/settings" className="font-bold text-violet-600 underline dark:text-violet-300">
                Ayarlar
              </Link>{" "}
              sayfasindaki <strong>Ozel marka alan adi</strong> kutusuna kullanmak istediginiz alan adini yazin
              (orn. <span className={code}>q.firmaniz.com</span>) ve <strong>Dogrula</strong> butonuna basin.
            </p>
            <p>
              Bu adim alan adini sisteme kaydeder ve sahipligi kanitlamaniz icin benzersiz bir <strong>TXT kaydi</strong> uretir.
              Bu kayit ekranda gosterilir.
            </p>
          </Step>

          <Step no={2} title="DNS saglayicinizda TXT kaydini ekleyin">
            <p>
              Alan adinizi aldiginiz yerin (GoDaddy, Natro, isimtescil, Cloudflare, Google Domains vb.) DNS yonetim
              paneline girin ve asagidaki bilgilerle yeni bir <strong>TXT</strong> kaydi olusturun:
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid gap-1">
                <span>Tur: <span className={code}>TXT</span></span>
                <span>Host / Ad: <span className={code}>_qrpublish-verify.q.firmaniz.com</span> (ayarlar sayfasinda gosterilen tam deger)</span>
                <span>Deger: ayarlar sayfasinda gosterilen rastgele kod</span>
                <span>TTL: varsayilan birakabilirsiniz (300 veya Auto)</span>
              </div>
            </div>
            <p>
              Bazi panellerde host alanina sadece <span className={code}>_qrpublish-verify</span> yazmaniz, alan adinizin
              kalanini panel kendisi eklemesi gerekebilir — bu, saglayicidan saglayiciya degisir.
            </p>
          </Step>

          <Step no={3} title="Yonlendirme (A) kaydini ekleyin">
            <p>
              Ayni DNS panelinde, alan adinizin sunucumuza yonlenmesi icin bir <strong>A kaydi</strong> da eklemeniz gerekiyor:
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid gap-1">
                <span>Tur: <span className={code}>A</span></span>
                <span>Host / Ad: <span className={code}>q</span> (veya kullandiginiz alt alan adi, apex icin <span className={code}>@</span>)</span>
                <span>Deger / IP: <span className={code}>158.220.106.172</span></span>
                <span>TTL: varsayilan</span>
              </div>
            </div>
            <p>Bu iki kayit (TXT + A) ayni anda durabilir, sirasi onemli degil.</p>
          </Step>

          <Step no={4} title="Ayarlar sayfasindan tekrar Dogrula'ya basin">
            <p>
              DNS degisiklikleri genelde birkac dakika icinde, bazen (saglayiciya bagli) birkac saate kadar yayilabilir
              ("propagation"). TXT kaydi yayildiktan sonra <strong>Dogrula</strong> butonuna tekrar basin.
            </p>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <p>
                <strong>DNS: Dogrulandi</strong> rozeti gorununce sahiplik kanitlanmis olur. Ardindan sistem otomatik
                olarak sunucu tarafinda yonlendirme ve SSL sertifikasi kurulumunu baslatir — bu adim 1-2 dakika surebilir.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300" />
              <p>
                <strong>Sunucu: Aktif</strong> rozeti gorununce alan adiniz <span className={code}>https://</span> ile
                guvenli sekilde calisir hale gelmistir. <strong>Sunucu: Kurulamadi</strong> gorurseniz birkac dakika
                sonra tekrar Dogrula'ya basin; sorun surerse destek ile iletisime gecin.
              </p>
            </div>
          </Step>

          <div className={`${panel} p-5`}>
            <h2 className="mb-2 font-black">Sik sorulan sorular</h2>
            <div className={`space-y-3 text-sm ${subtle}`}>
              <p>
                <strong>Dogrulama neden basarisiz oluyor?</strong> En sik sebep DNS'in henuz yayilmamis olmasidir.
                10-15 dakika bekleyip tekrar deneyin. TXT kaydinin host kismini eksiksiz girdiginizden emin olun.
              </p>
              <p>
                <strong>Hem alt alan adi hem apex (kok) domain kullanabilir miyim?</strong> Evet, ikisi de A kaydiyla
                ayni IP'ye yonlendirilebilir.
              </p>
              <p>
                <strong>SSL sertifikasi ucretli mi?</strong> Hayir, Let's Encrypt ile otomatik ve ucretsiz saglanir,
                kendiliginden yenilenir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
