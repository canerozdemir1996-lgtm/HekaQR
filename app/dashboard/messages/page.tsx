"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw, Search, Trash2, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/toast";

type MsgRow = {
  id: string;
  created_at: string;
  title: string | null;
  body: string | null;
  popup_kind?: "small" | "big" | string | null;
  read_at: string | null;
  deleted_by_user_at?: string | null;
};

const KEEP_DAYS = 30;

export default function DashboardMessagesPage() {
  const router = useRouter();
  const toast = useToast();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login");
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = getSupabase();
      const since = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.id) { setRows([]); return; }
      const { data, error } = await sb
        .from("admin_messages")
        .select("id, created_at, title, body, popup_kind, read_at, deleted_by_user_at")
        .eq("to_user_id", user.id)
        .is("deleted_by_user_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      setRows((data ?? []) as MsgRow[]);
    } catch (e) {
      setRows([]);
      toast.error(e instanceof Error ? e.message : "Mesajlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const markRead = useCallback(async (id: string) => {
    try {
      const sb = getSupabase();
      await sb.from("admin_messages").update({ read_at: new Date().toISOString() }).eq("id", id);
      setRows(p => p.map(r => r.id === id ? { ...r, read_at: new Date().toISOString() } : r));
    } catch { /* ignore */ }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    if (!confirm("Bu mesaj silinsin mi?")) return;
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.id) return;
      const { error } = await sb
        .from("admin_messages")
        .update({ deleted_by_user_at: new Date().toISOString() })
        .eq("id", id)
        .eq("to_user_id", user.id);
      if (error) throw new Error(error.message);
      setRows(p => p.filter(r => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Silinemedi");
    }
  }, [toast]);

  const deleteAll = useCallback(async () => {
    if (!confirm("Tüm mesajlar silinsin mi? (Geri alınamaz)")) return;
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.id) return;
      const { error } = await sb
        .from("admin_messages")
        .update({ deleted_by_user_at: new Date().toISOString() })
        .eq("to_user_id", user.id)
        .is("deleted_by_user_at", null);
      if (error) throw new Error(error.message);
      setRows([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Silinemedi");
    }
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchText =
        !q ||
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
          <Link href="/dashboard" className={`flex items-center gap-1.5 text-sm ${sub} hover:text-violet-400 transition-colors`}>
            <ArrowLeft size={14}/> Dashboard
          </Link>
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
          <button onClick={() => void load()}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}
            title="Yenile"
          >
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        <div className={`rounded-2xl border ${card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-56">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Başlık veya mesaj içinde ara…"
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
            <span className={`text-[11px] ${sub}`}>Son {KEEP_DAYS} gün</span>
          </div>
        </div>

        <div className={`rounded-2xl border ${card} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={18} className="animate-spin text-violet-400"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Mail size={32} className={`mx-auto mb-3 ${sub}`}/>
              <p className={`text-sm font-medium ${sub}`}>Mesaj yok</p>
              <p className={`text-xs ${sub} mt-1`}>Owner’dan gelen popup mesajlar burada görünür.</p>
            </div>
          ) : (
            filtered.map(r => {
              const kind = (r.popup_kind ?? "small") as string;
              const title = r.title ?? "System Owner";
              const body = r.body ?? "";
              const isUnread = !r.read_at;
              return (
                <div
                  key={r.id}
                  className={`px-5 py-4 border-b last:border-0 ${isDark ? "border-white/[0.06]" : "border-slate-100"} ${isUnread ? (isDark ? "bg-violet-950/20" : "bg-violet-50/50") : ""}`}
                  onMouseDown={() => { if (isUnread) void markRead(r.id); }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 shrink-0">
                      {r.read_at ? <CheckCircle2 size={14} className="text-emerald-400"/> : <Circle size={14} className="text-amber-400"/>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-sm font-black truncate ${tx}`}>{title}</p>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          kind === "big"
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : isDark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}>
                          {kind === "big" ? "BÜYÜK" : "KÜÇÜK"}
                        </span>
                        <span className={`ml-auto text-[11px] ${sub}`}>
                          {r.created_at ? new Date(r.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      </div>
                      <p className={`text-[13px] mt-1 whitespace-pre-wrap ${isDark ? "text-slate-200" : "text-slate-700"}`}>{body}</p>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => void deleteOne(r.id)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

