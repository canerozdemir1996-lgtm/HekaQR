"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Database, HardDrive, RefreshCw, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Loader2, RotateCcw, Lock, Shield, Eye, EyeOff,
} from "lucide-react";
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

type RestoreRequest = {
  id: string;
  backup_kind: string;
  backup_label: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  error: string | null;
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

const RESTORE_STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal edildi",
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

// ─── Restore Modal ────────────────────────────────────────────────────────────

type RestoreStep = "form" | "submitting" | "done" | "error";

function RestoreModal({
  isDark,
  mfaActive,
  onClose,
  onSuccess,
}: {
  isDark: boolean;
  mfaActive: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<RestoreStep>("form");
  const [kind, setKind] = useState<"db" | "storage">("db");
  const [label, setLabel] = useState("");
  const [confirm, setConfirm] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [error, setError] = useState("");

  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-400" : "text-slate-500";
  const card = isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200";
  const input = isDark
    ? "bg-slate-800 border-white/10 text-slate-100 placeholder-slate-600 focus:border-violet-400"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500";

  const canSubmit = confirm === "RESTORE" && totpCode.length === 6 && label.trim().length > 0 && mfaActive;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStep("submitting");
    setError("");

    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ totpCode, confirm, backupKind: kind, backupLabel: label.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "İstek gönderilemedi.");
        setStep("error");
        return;
      }
      setStep("done");
      onSuccess();
    } catch {
      setError("Bağlantı hatası oluştu.");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${card} p-6 space-y-5`}
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <RotateCcw size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className={`text-base font-black ${tx}`}>Yedekten Geri Yükle</h2>
            <p className={`text-xs ${sub}`}>Bu işlem mevcut verileri kalıcı olarak değiştirebilir.</p>
          </div>
        </div>

        {!mfaActive && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <span>Bu işlem için 2FA zorunludur. Hesap ayarlarınızdan 2FA'yı etkinleştirin.</span>
          </div>
        )}

        {step === "done" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 size={16} />
              <span>Geri yükleme isteği oluşturuldu. İşlem arka planda başlatılacak.</span>
            </div>
            <button onClick={onClose} className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
              Kapat
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Yedek türü */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold ${tx}`}>Yedek Türü</label>
              <select
                value={kind}
                onChange={e => setKind(e.target.value as "db" | "storage")}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`}
                disabled={!mfaActive || step === "submitting"}
              >
                <option value="db">Veritabanı</option>
                <option value="storage">Depolama</option>
              </select>
            </div>

            {/* Yedek etiketi */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold ${tx}`}>Yedek Etiketi / Dosya Adı</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Örn: db-2026-06-25 veya backup-20260625.sql"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`}
                disabled={!mfaActive || step === "submitting"}
              />
            </div>

            {/* Uyarı kutusu */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 space-y-1">
              <p className="font-bold">⚠️ Bu işlem mevcut verileri geri döndürülemez şekilde değiştirebilir.</p>
              <p>Devam etmek için aşağıya <strong>RESTORE</strong> yazın.</p>
            </div>

            {/* Onay metni */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold ${tx}`}>Onay</label>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value.toUpperCase())}
                placeholder="RESTORE"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono outline-none transition ${input}`}
                disabled={!mfaActive || step === "submitting"}
              />
            </div>

            {/* 2FA kodu */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold ${tx}`}>2FA Kodu</label>
              <div className="relative">
                <input
                  type={showTotp ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm font-mono tracking-widest outline-none transition ${input}`}
                  disabled={!mfaActive || step === "submitting"}
                />
                <button
                  type="button"
                  onClick={() => setShowTotp(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${sub}`}
                >
                  {showTotp ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {(step === "error" || error) && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <XCircle size={14} className="mt-0.5 shrink-0" />
                {error || "Bir hata oluştu."}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                İptal
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || step === "submitting"}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === "submitting" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Geri Yükle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function BackupsPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { data: session, status } = useSession();

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [restoreRequests, setRestoreRequests] = useState<RestoreRequest[]>([]);
  const [mfaActive, setMfaActive] = useState(false);
  const [error, setError] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    const role = session?.user?.role;
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
      const headers = await getAuthHeaders();
      const [backupRes, restoreRes, mfaRes] = await Promise.all([
        fetch("/api/admin/backups", { headers }),
        fetch("/api/admin/backups/restore", { headers }),
        fetch("/api/v1/auth/mfa/status", { credentials: "same-origin", cache: "no-store" }),
      ]);

      const backupJson = await backupRes.json();
      if (!backupRes.ok) throw new Error(backupJson.error ?? "Yedekler yüklenemedi");
      setRuns(backupJson.runs ?? []);
      setSummary(backupJson.summary ?? []);

      if (restoreRes.ok) {
        const restoreJson = await restoreRes.json();
        setRestoreRequests(restoreJson.requests ?? []);
      }

      if (mfaRes.ok) {
        const mfaJson = await mfaRes.json();
        setMfaActive(Boolean(mfaJson.enabled));
      }
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
      {showRestoreModal && (
        <RestoreModal
          isDark={isDark}
          mfaActive={mfaActive}
          onClose={() => setShowRestoreModal(false)}
          onSuccess={() => { setShowRestoreModal(false); void load(); }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-black ${tx}`}>Sistem Yedekleri</h1>
          <p className={`text-xs ${sub} mt-1`}>Sadece System Owner görebilir — veritabanı, depolama ve geri yükleme testi geçmişi.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRestoreModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all
              ${isDark ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
          >
            <RotateCcw size={13} />
            Geri Yükle
            {!mfaActive && <Lock size={11} className="ml-0.5 opacity-60" />}
          </button>
          <button
            onClick={() => void load()}
            className={`p-2.5 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {!mfaActive && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <span>Geri yükleme işlemi için 2FA zorunludur. <strong>Ayarlar › Güvenlik</strong>'ten etkinleştirin.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Özet kartlar */}
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

      {/* Geri yükleme istekleri */}
      {restoreRequests.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-3 border-b text-xs font-black ${tx} flex items-center gap-2 ${isDark ? "border-white/10" : "border-slate-100"}`}>
            <Shield size={13} className="text-violet-400" />
            Geri Yükleme İstekleri ({restoreRequests.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-[10px] font-black uppercase tracking-wider ${sub}`}>
                  <th className="px-5 py-2.5">Tür</th>
                  <th className="px-5 py-2.5">Etiket</th>
                  <th className="px-5 py-2.5">Durum</th>
                  <th className="px-5 py-2.5">İstek Zamanı</th>
                  <th className="px-5 py-2.5">Tamamlandı</th>
                </tr>
              </thead>
              <tbody>
                {restoreRequests.map((r) => (
                  <tr key={r.id} className={`border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                    <td className={`px-5 py-3 font-bold ${tx}`}>{r.backup_kind.toUpperCase()}</td>
                    <td className={`px-5 py-3 ${sub} max-w-[200px] truncate`}>{r.backup_label}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold ${
                        r.status === "completed" ? "text-emerald-400" :
                        r.status === "failed" ? "text-red-400" :
                        r.status === "running" ? "text-blue-400" : "text-amber-400"
                      }`}>
                        {RESTORE_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className={`px-5 py-3 ${sub}`}>{formatDate(r.requested_at)}</td>
                    <td className={`px-5 py-3 ${sub}`}>{r.completed_at ? formatDate(r.completed_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yedek çalışma geçmişi */}
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
