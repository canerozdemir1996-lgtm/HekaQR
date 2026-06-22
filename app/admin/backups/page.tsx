"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Database, HardDrive, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type Kind = "db" | "storage" | "restore_test";

type BackupRun = {
  id: string;
  kind: Kind;
  status: "success" | "failed";
  started_at: string | null;
  finished_at: string;
  size_bytes: number | null;
  detail: string | null;
};

type Summary = {
  kind: Kind;
  lastSuccessAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  stale: boolean;
};

const KIND_LABEL: Record<Kind, string> = {
  db: "Veritabanı Yedeği",
  storage: "Depolama Yedeği",
  restore_test: "Geri Yükleme Testi",
};

const KIND_ICON: Record<Kind, typeof Database> = {
  db: Database,
  storage: HardDrive,
  restore_test: ShieldCheck,
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "Hiç çalışmadı";
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function BackupsPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { data: session, status } = useSession();

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    const role = session?.user?.role;
    // Kasıtlı olarak admin/owner ortak kapısı yerine SADECE owner — bu sayfa
    // yedek altyapısının iç durumunu gösteriyor, admin rolünün görmesi
    // gerekmiyor.
    if (status === "unauthenticated" || role !== "owner") {
      router.push("/dashboard");
      return;
    }
    setChecked(true);
  }, [status, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backups", { headers: await getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Yedekler yüklenemedi");
      setRuns(json.runs ?? []);
      setSummary(json.summary ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yedekler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (checked) void load(); }, [checked, load]);

  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const card = isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white";

  if (!checked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-black ${tx}`}>Sistem Yedekleri</h1>
          <p className={`text-xs ${sub} mt-1`}>Sadece System Owner görebilir — veritabanı, depolama ve geri yükleme testi geçmişi.</p>
        </div>
        <button onClick={() => void load()}
          className={`p-2.5 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["db", "storage", "restore_test"] as Kind[]).map((kind) => {
          const s = summary.find((x) => x.kind === kind);
          const Icon = KIND_ICON[kind];
          const stale = s?.stale ?? true;
          return (
            <div key={kind} className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={16} className={stale ? "text-amber-400" : "text-emerald-400"} />
                  <span className={`text-xs font-black ${tx}`}>{KIND_LABEL[kind]}</span>
                </div>
                {stale ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle size={10} /> GECİKMİŞ
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={10} /> GÜNCEL
                  </span>
                )}
              </div>
              <p className={`text-[11px] ${sub}`}>Son başarılı yedek</p>
              <p className={`text-sm font-bold ${tx}`}>{formatDate(s?.lastSuccessAt ?? null)}</p>
              {s?.lastRunStatus === "failed" && (
                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                  <XCircle size={11} /> Son çalışma başarısız oldu
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-5 py-3 border-b text-xs font-black ${tx} ${isDark ? "border-white/10" : "border-slate-100"}`}>
          Geçmiş ({runs.length})
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={18} className="animate-spin text-violet-400" />
          </div>
        ) : runs.length === 0 ? (
          <div className="py-16 text-center">
            <Database size={28} className={`mx-auto mb-3 ${sub}`} />
            <p className={`text-sm font-medium ${sub}`}>Henüz hiç yedek kaydı yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-[10px] font-black uppercase tracking-wider ${sub}`}>
                  <th className="px-5 py-2.5">Tür</th>
                  <th className="px-5 py-2.5">Durum</th>
                  <th className="px-5 py-2.5">Tamamlandı</th>
                  <th className="px-5 py-2.5">Boyut</th>
                  <th className="px-5 py-2.5">Detay</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className={`border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                    <td className={`px-5 py-3 font-bold ${tx}`}>{KIND_LABEL[r.kind]}</td>
                    <td className="px-5 py-3">
                      {r.status === "success" ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 size={13} /> Başarılı</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><XCircle size={13} /> Başarısız</span>
                      )}
                    </td>
                    <td className={`px-5 py-3 ${sub}`}>{formatDate(r.finished_at)}</td>
                    <td className={`px-5 py-3 ${sub}`}>{formatBytes(r.size_bytes)}</td>
                    <td className={`px-5 py-3 ${sub} max-w-xs truncate`} title={r.detail ?? ""}>{r.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
