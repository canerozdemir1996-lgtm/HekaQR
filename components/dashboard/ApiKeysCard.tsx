"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Key, Loader2, Plus, Trash2, Copy, Check, ExternalLink } from "lucide-react";

type ApiKey = { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

export default function ApiKeysCard({ panelClass, subtleClass, inputClass }: { panelClass: string; subtleClass: string; inputClass: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/v1/keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => setKeys(Array.isArray(body?.keys) ? body.keys : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "API Key" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Anahtar oluşturulamadı.");
      setNewKey(body.api_key);
      setName("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anahtar oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm("Bu API anahtarını iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    try {
      const res = await fetch(`/api/v1/keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("İptal edilemedi.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İptal edilemedi.");
    }
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(newKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <section className={`${panelClass} p-5`}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          <Key size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black">API Anahtarları</h2>
          <p className={`mt-1 text-sm ${subtleClass}`}>
            QR&apos;larınızı kendi sisteminizden yönetmek için API anahtarı oluşturun.{" "}
            <Link href="/developers" target="_blank" className="inline-flex items-center gap-1 text-violet-600 hover:underline dark:text-violet-300">
              API dokümantasyonu <ExternalLink size={11} />
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Bu anahtar bir kez gösterilir — şimdi kopyalayın</p>
            <button onClick={copyKey} className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline dark:text-amber-300">
              {copied ? <Check size={12} /> : <Copy size={12} />} Kopyala
            </button>
          </div>
          <p className="break-all font-mono text-xs text-amber-800 dark:text-amber-200">{newKey}</p>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Anahtar adı (örn. Zapier entegrasyonu)"
          className={inputClass}
        />
        <button onClick={create} disabled={creating} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition-colors hover:bg-violet-500 disabled:opacity-60">
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Oluştur
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Yükleniyor...</div>
      ) : activeKeys.length === 0 ? (
        <p className={`text-sm ${subtleClass}`}>Henüz API anahtarınız yok.</p>
      ) : (
        <div className="space-y-2">
          {activeKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{k.name}</p>
                <p className={`text-xs ${subtleClass}`}>
                  Oluşturuldu: {new Date(k.created_at).toLocaleDateString("tr-TR")}
                  {k.last_used_at ? ` · Son kullanım: ${new Date(k.last_used_at).toLocaleDateString("tr-TR")}` : " · Henüz kullanılmadı"}
                </p>
              </div>
              <button onClick={() => revoke(k.id)} className="shrink-0 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" title="İptal et">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
