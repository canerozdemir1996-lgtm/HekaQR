"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Loader2, Mail, RefreshCw, Search, User, CheckCircle2, Circle, Send, X, Trash2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type MessageRow = {
  id: string;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string;
  title: string;
  body: string;
  popup_kind?: "small" | "big" | string | null;
  read_at: string | null;
  to_user?: { email: string; full_name?: string };
  from_user?: { email: string; full_name?: string } | null;
};

function SendModal({ toUserId, toLabel, isDark, onClose, onSent }: {
  toUserId: string;
  toLabel: string;
  isDark: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState("System Owner");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"small" | "big">("small");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ to_user_id: toUserId, title, body, popup_kind: kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      onSent();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const inp = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400";
  const pillWrap = `flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`;
  const pillBase = `px-3 py-1.5 rounded-lg text-xs font-black transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-scalein ${isDark ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-black text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Popup Mesaj Gönder</h3>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={15}/>
          </button>
        </div>

        <p className={`text-xs mb-4 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          Hedef: <b>{toLabel}</b>
        </p>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
            <X size={13}/> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Popup tipi</label>
            <div className="mt-2 flex items-center gap-2">
              <div className={pillWrap}>
                <button
                  type="button"
                  onClick={() => setKind("small")}
                  className={`${pillBase} ${kind === "small" ? "bg-violet-600 text-white" : (isDark ? "text-slate-400 hover:text-violet-300" : "text-slate-500 hover:text-violet-600")}`}
                >
                  Küçük
                </button>
                <button
                  type="button"
                  onClick={() => setKind("big")}
                  className={`${pillBase} ${kind === "big" ? "bg-red-600 text-white" : (isDark ? "text-slate-400 hover:text-red-300" : "text-slate-500 hover:text-red-600")}`}
                >
                  Büyük ikaz
                </button>
              </div>
              <span className={`text-[11px] ${isDark ? "text-slate-600" : "text-slate-500"}`}>
                {kind === "big" ? "Ekran ortasında büyük uyarı" : "Sağ üstte küçük popup"}
              </span>
            </div>
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Başlık</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              className={`w-full mt-1 border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`} />
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Mesaj</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={500}
              placeholder="Kullanıcıya gösterilecek mesaj…"
              className={`w-full mt-1 border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}
              rows={4}
            />
            <p className={`text-[10px] mt-1 ${isDark ? "text-slate-600" : "text-slate-500"}`}>{body.length}/500</p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-white/20 hover:text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            İptal
          </button>
          <button onClick={send} disabled={loading || !body.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-premium focus-premium">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [actorOk, setActorOk] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [sendTo, setSendTo] = useState<{ id: string; label: string } | null>(null);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user.role as "admin" | "owner" | "user" | undefined)
      || (session?.user as any)?.user_metadata?.role
      || "user";

    if (status === "unauthenticated" || (role !== "owner" && role !== "admin")) {
      router.push("/login");
      return;
    }

    setActorOk(true);
  }, [router, session, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/messages?limit=300", { headers: await getAuthHeaders() });
      const json = await res.json();
      setRows((json.messages ?? []) as MessageRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    if (!confirm("Bu mesaj silinsin mi?")) return;
    await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await getAuthHeaders() });
    await load();
  }, [load]);

  const deleteAll = useCallback(async () => {
    if (!confirm("Tüm mesajlar silinsin mi? (Geri alınamaz)")) return;
    await fetch(`/api/admin/messages?all=1`, { method: "DELETE", headers: await getAuthHeaders() });
    await load();
  }, [load]);

  useEffect(() => {
    if (!actorOk) return;
    load();
  }, [actorOk, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchText =
        !q ||
        (r.to_user?.email ?? "").toLowerCase().includes(q) ||
        (r.to_user?.full_name ?? "").toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        (r.body ?? "").toLowerCase().includes(q);
      const matchRead =
        filter === "all" ? true : filter === "read" ? !!r.read_at : !r.read_at;
      return matchText && matchRead;
    });
  }, [rows, search, filter]);

  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const inputCls = isDark
    ? "bg-white/5 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus-premium"
    : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus-premium";

  return (
    <div className="min-h-screen app-bg">
      <header className={`sticky top-0 z-20 border-b ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"} backdrop-blur-2xl px-6 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")}
            className={`flex items-center gap-1.5 text-sm ${sub} hover:text-violet-400 transition-colors`}>
            <ArrowLeft size={14}/> Admin
          </button>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-violet-400"/>
            <span className={`font-black text-sm ${tx}`}>Mesajlar</span>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"}`}>
            {rows.length} kayıt
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
          <button onClick={() => void deleteAll()}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
            title="Tüm mesajları sil"
          >
            <Trash2 size={13}/>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        <div className={`rounded-2xl border ${card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-56">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="E-posta, isim, başlık veya mesaj ile ara…"
                className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`}/>
            </div>
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              {(["all", "unread", "read"] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === s ? "bg-violet-600 text-white" : `${sub} hover:text-violet-400`}`}>
                  {s === "all" ? "Tümü" : s === "unread" ? "Okunmadı" : "Okundu"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border ${card} overflow-hidden`}>
          <div className={`hidden lg:grid grid-cols-12 gap-3 px-5 py-3 border-b text-[10px] font-black uppercase tracking-widest ${sub} ${isDark ? "bg-white/[0.02] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <div className="col-span-3">Hedef</div>
            <div className="col-span-2">Durum</div>
            <div className="col-span-5">Mesaj</div>
            <div className="col-span-1">Tarih</div>
            <div className="col-span-1 text-right">İşlem</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-violet-400"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Mail size={32} className={`mx-auto mb-3 ${sub}`}/>
              <p className={`text-sm font-medium ${sub}`}>Kayıt bulunamadı</p>
            </div>
          ) : (
            filtered.map(r => {
              const label = r.to_user?.full_name ? `${r.to_user.full_name} · ${r.to_user.email}` : (r.to_user?.email ?? r.to_user_id);
              const kind = (r.popup_kind ?? "small") as string;
              return (
                <div key={r.id} className={`grid grid-cols-12 gap-3 px-5 py-4 border-b ${isDark ? "border-white/[0.06]" : "border-slate-100"} hover:bg-white/[0.02] transition-colors items-center last:border-0`}>
                  <div className="col-span-3 min-w-0">
                    <p className={`text-sm font-semibold truncate ${tx}`}>{r.to_user?.full_name ?? "—"}</p>
                    <p className={`text-[11px] truncate ${sub}`}>{r.to_user?.email ?? r.to_user_id}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-xs">
                    {r.read_at ? <CheckCircle2 size={14} className="text-emerald-400"/> : <Circle size={14} className="text-amber-400"/>}
                    <span className={sub}>{r.read_at ? "Okundu" : "Okunmadı"}</span>
                  </div>
                  <div className="col-span-5 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-sm font-black truncate ${tx}`}>{r.title || "System Owner"}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        kind === "big"
                          ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : isDark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}>
                        {kind === "big" ? "BÜYÜK" : "KÜÇÜK"}
                      </span>
                    </div>
                    <p className={`text-[12px] truncate ${sub}`}>{r.body}</p>
                  </div>
                  <div className={`col-span-1 text-[11px] ${sub}`}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : "—"}
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      onClick={() => void deleteOne(r.id)}
                      className={`p-2 rounded-xl border transition-all mr-2 ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                      title="Mesajı sil"
                    >
                      <Trash2 size={13}/>
                    </button>
                    <button
                      onClick={() => setSendTo({ id: r.to_user_id, label })}
                      className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      title="Tekrar mesaj gönder"
                    >
                      <Send size={13}/>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {sendTo && (
        <SendModal
          toUserId={sendTo.id}
          toLabel={sendTo.label}
          isDark={isDark}
          onClose={() => setSendTo(null)}
          onSent={() => void load()}
        />
      )}
    </div>
  );
}

