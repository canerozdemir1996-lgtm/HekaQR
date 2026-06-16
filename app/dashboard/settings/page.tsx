"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Moon,
  Save,
  Settings,
  Sun,
  Webhook,
} from "lucide-react";
import {
  getOrCreateSettings,
  updateSettings,
  type UserSettings,
} from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getOrCreateSettings()
      .then((row) => {
        if (alive) setSettings(row);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Ayarlar yuklenemedi.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateSettings({
        custom_domain: cleanDomain(settings.custom_domain),
        ga4_measurement_id: emptyToNull(settings.ga4_measurement_id),
        gtm_container_id: emptyToNull(settings.gtm_container_id),
        webhook_url: emptyToNull(settings.webhook_url),
      });
      setSettings(updated);
      setMessage("Kaydedildi");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const pageBg = "min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 dark:border-white/10 dark:bg-[#020617] dark:text-slate-100 dark:placeholder:text-slate-600";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Dashboard'a don"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Dashboard</p>
              <h1 className="text-2xl font-black tracking-tight">Ayarlar</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title={isDark ? "Gunduz modu" : "Gece modu"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={save}
              disabled={!settings || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Kaydet
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check size={16} />
            {message}
          </div>
        )}

        {loading ? (
          <div className={`${panel} flex h-64 items-center justify-center`}>
            <Loader2 className="animate-spin text-violet-500" size={28} />
          </div>
        ) : (
          <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="font-black">White-label domain</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>QR linkleri icin kullanilacak ozel alan adini kaydedin.</p>
                </div>
              </div>
              <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Custom Domain</label>
              <input
                value={settings?.custom_domain ?? ""}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, custom_domain: e.target.value } : prev)}
                placeholder="q.sirketiniz.com"
                className={`${input} font-mono`}
              />
              <p className={`mt-2 text-xs ${subtle}`}>DNS yonlendirmesi ayrica Vercel uzerinden yapilmalidir.</p>
            </section>

            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  <Webhook size={20} />
                </div>
                <div>
                  <h2 className="font-black">Tracking varsayilanlari</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Yeni QR'larda kullanmak uzere entegrasyon ID'lerini tutun.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>GA4 Measurement ID</label>
                  <input
                    value={settings?.ga4_measurement_id ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, ga4_measurement_id: e.target.value } : prev)}
                    placeholder="G-XXXXXXXXXX"
                    className={`${input} font-mono`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>GTM Container ID</label>
                  <input
                    value={settings?.gtm_container_id ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, gtm_container_id: e.target.value } : prev)}
                    placeholder="GTM-XXXXXXX"
                    className={`${input} font-mono`}
                  />
                </div>
              </div>
            </section>

            <section className={`${panel} p-5 lg:col-span-2`}>
              <h2 className="font-black">Webhook</h2>
              <p className={`mt-1 text-sm ${subtle}`}>Tarama olaylarini CRM, Google Sheets veya otomasyon sisteminize gondermek icin kullanilir.</p>
              <label className={`mt-5 block text-xs font-bold uppercase tracking-widest ${subtle}`}>Webhook URL</label>
              <input
                value={settings?.webhook_url ?? ""}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, webhook_url: e.target.value } : prev)}
                placeholder="https://example.com/webhook"
                className={`${input} font-mono`}
              />
              <p className={`mt-2 text-xs ${subtle}`}>
                Beklenen payload: <span className="font-mono">qr_scan, qr_id, slug, device, os, country</span>
              </p>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

function emptyToNull(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function cleanDomain(value?: string | null) {
  const clean = value?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return clean ? clean : null;
}
