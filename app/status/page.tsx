import Link from "next/link";
import { Activity, CheckCircle2, Clock3, Mail, RadioTower, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { statusComponents, statusIncidents, statusUpdatedAt, type ServiceStatus, type StatusIncident, type StatusUpdate } from "@/lib/status-updates";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("QR Publish Durum Sayfası");
export const dynamic = "force-dynamic";

const statusCopy: Record<ServiceStatus, { label: string; className: string }> = {
  operational: {
    label: "Son kayıtta çalışıyor",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  degraded: {
    label: "Son kayıtta yavaşlama var",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  },
  maintenance: {
    label: "Planlı bakım",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
  },
  incident: {
    label: "Bilinen olay var",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
  },
};

const incidentCopy: Record<StatusIncident["status"], { label: string; className: string }> = {
  resolved: {
    label: "Çözüldü",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  monitoring: {
    label: "İzleniyor",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  },
  investigating: {
    label: "İnceleniyor",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  },
  scheduled: {
    label: "Planlandı",
    className: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  },
};

const toneClass: Record<StatusUpdate["tone"], string> = {
  success: "bg-emerald-500",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function overallStatus() {
  if (statusComponents.some(component => component.status === "incident")) return statusCopy.incident;
  if (statusComponents.some(component => component.status === "degraded")) return statusCopy.degraded;
  if (statusComponents.some(component => component.status === "maintenance")) return statusCopy.maintenance;
  return statusCopy.operational;
}

function statusFreshness() {
  const updatedAt = new Date(statusUpdatedAt);
  const ageMs = Date.now() - updatedAt.getTime();
  const ageHours = Math.max(0, Math.floor(ageMs / (60 * 60 * 1000)));
  const ageDays = Math.floor(ageHours / 24);
  return {
    stale: !Number.isFinite(ageMs) || ageHours > 24,
    ageLabel: ageDays > 0 ? `${ageDays} gün önce` : ageHours > 0 ? `${ageHours} saat önce` : "son bir saat içinde",
  };
}

export default function StatusPage() {
  const overall = overallStatus();
  const freshness = statusFreshness();

  return (
    <PublicSiteShell className="bg-slate-50 text-slate-950 dark:bg-[#020617] dark:text-white">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">QR Publish Sistem Durumu</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Sistem durumu ve olay geçmişi</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Bu sayfa otomatik canlı izleme ekranı değildir. Servis durumları, bakım notları ve olay güncellemeleri ekip tarafından yayımlanan son kaydı gösterir.
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${overall.className}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} />
              <div>
                <p className="text-sm font-black">{overall.label}</p>
                <p className="mt-1 text-xs font-bold opacity-75">Kayıt zamanı: {formatDate(statusUpdatedAt)} · {freshness.ageLabel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${freshness.stale ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100" : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100"}`}>
          <div className="flex items-start gap-3">
            {freshness.stale ? <TriangleAlert size={20} className="mt-0.5 shrink-0" /> : <Clock3 size={20} className="mt-0.5 shrink-0" />}
            <div>
              <p className="font-black">{freshness.stale ? "Durum kaydı güncel olmayabilir" : "Yakın zamanda güncellendi"}</p>
              <p className="mt-1 text-sm font-semibold leading-6 opacity-85">
                {freshness.stale
                  ? "Son manuel kayıt 24 saatten eski. Acil veya hesabınıza özel bir sorun yaşıyorsanız destek ekibine yazın."
                  : "Aşağıdaki bilgiler son manuel kontrolün kaydıdır; anlık çalışma garantisi değildir."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/status" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-black text-slate-900 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
              <RefreshCw size={15} /> Sayfayı yenile
            </a>
            <Link href="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 dark:bg-white dark:text-slate-950">
              <Mail size={15} /> Destek al
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {statusComponents.map((component) => {
            const status = statusCopy[component.status];
            return (
              <div key={component.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  <Activity size={18} />
                </div>
                <h2 className="mt-4 text-sm font-black">{component.name}</h2>
                <p className="mt-2 min-h-12 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{component.description}</p>
                <span className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-emerald-500" />
                <h2 className="font-black">Güncelleme geçmişi</h2>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Yeni bakım, kesinti veya ürün güncellemesi olduğunda bu zaman çizelgesine yeni kayıt eklenir.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <RadioTower size={20} className="text-blue-500" />
                <h2 className="font-black">Servis bileşenleri</h2>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Dashboard, yönlendirme, analitik ve bildirim katmanları ayrı ayrı takip edilir.
              </p>
            </div>
          </aside>

          <div className="space-y-5">
            {statusIncidents.map((incident) => {
              const incidentStatus = incidentCopy[incident.status];
              return (
                <article key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">{incident.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${incidentStatus.className}`}>
                          {incidentStatus.label}
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Clock3 size={14} />
                        Başlangıç: {formatDate(incident.startedAt)}
                        {incident.resolvedAt ? ` · Bitiş: ${formatDate(incident.resolvedAt)}` : ""}
                      </p>
                    </div>
                    {incident.status !== "resolved" && <TriangleAlert size={20} className="text-amber-500" />}
                  </div>

                  <div className="mt-5 space-y-4">
                    {incident.updates.map((update) => (
                      <div key={`${incident.id}-${update.at}`} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`mt-1 h-3 w-3 rounded-full ${toneClass[update.tone]}`} />
                          <span className="mt-2 h-full w-px bg-slate-200 dark:bg-white/10" />
                        </div>
                        <div className="pb-2">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{formatDate(update.at)}</p>
                          <h3 className="mt-1 text-sm font-black">{update.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{update.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </PublicSiteShell>
  );
}
