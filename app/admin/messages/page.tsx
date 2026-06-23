"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2, Mail, RefreshCw, Search, CheckCircle2, Circle, Reply, Trash2, Plus, Undo2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { SendNotificationModal, type DefaultAudience } from "@/components/admin/SendNotificationModal";
import { SafeMessageHtml } from "@/components/messages/SafeMessageHtml";

type MessageRow = {
  id: string;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string;
  title: string;
  body: string;
  popup_kind?: "small" | "big" | string | null;
  read_at: string | null;
  audience_label?: string | null;
  deleted_by_admin_at?: string | null;
  to_user?: { email: string; full_name?: string };
  from_user?: { email: string; full_name?: string } | null;
};

export default function MessagesPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [actorOk, setActorOk] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [view, setView] = useState<"active" | "deleted">("active");
  const [composeAudience, setComposeAudience] = useState<DefaultAudience | null | undefined>(undefined);

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

  const load = useCallback(async (currentView: "active" | "deleted") => {
    setLoading(true);
    try {
      const includeDeleted = currentView === "deleted" ? "&includeDeleted=1" : "";
      const res = await fetch(`/api/admin/messages?limit=300${includeDeleted}`, { headers: await getAuthHeaders() });
      const json = await res.json();
      setRows((json.messages ?? []) as MessageRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    if (!confirm("Bu mesaj silinsin mi? (Sonradan geri alabilirsiniz)")) return;
    await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await getAuthHeaders() });
    await load(view);
  }, [load, view]);

  const deleteAll = useCallback(async () => {
    if (!confirm("Tüm mesajlar silinsin mi? (Silinenler sekmesinden geri alabilirsiniz)")) return;
    await fetch(`/api/admin/messages?all=1`, { method: "DELETE", headers: await getAuthHeaders() });
    await load(view);
  }, [load, view]);

  const restoreOne = useCallback(async (id: string) => {
    await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}&action=restore`, { method: "PATCH", headers: await getAuthHeaders() });
    await load(view);
  }, [load, view]);

  useEffect(() => {
    if (!actorOk) return;
    void load(view);
  }, [actorOk, view, load]);

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
    <div className="px-6 py-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className={`text-xl font-black tracking-tight ${tx}`}>Mesajlar</h1>
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"}`}>
            {loading ? "—" : `${rows.length} kayıt`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setComposeAudience(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all btn-premium focus-premium">
            <Plus size={14}/> Yeni Bildirim
          </button>
          <button onClick={() => void load(view)}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
          {view === "active" && (
            <button onClick={() => void deleteAll()}
              className={`p-2 rounded-xl border transition-all ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
              title="Tüm mesajları sil"
            >
              <Trash2 size={13}/>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className={`rounded-2xl border ${card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-56">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="E-posta, isim, başlık veya mesaj ile ara…"
                className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`}/>
            </div>
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              {(["active", "deleted"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : `${sub} hover:text-violet-400`}`}>
                  {v === "active" ? "Aktif" : "Silinenler"}
                </button>
              ))}
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
                    {r.audience_label && <p className={`text-[10px] truncate ${sub}`}>{r.audience_label}</p>}
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
                        {kind === "big" ? "Yüksek" : "Düşük"}
                      </span>
                    </div>
                    <SafeMessageHtml
                      html={r.body}
                      className={`mt-1 max-h-28 overflow-auto pr-1 text-[12px] leading-5 ${sub}`}
                    />
                  </div>
                  <div className={`col-span-1 text-[11px] ${sub}`}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : "—"}
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {view === "deleted" ? (
                      <button
                        onClick={() => void restoreOne(r.id)}
                        className={`p-2 rounded-xl border transition-all mr-2 ${isDark ? "border-emerald-900/40 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                        title="Geri al"
                      >
                        <Undo2 size={13}/>
                      </button>
                    ) : (
                      <button
                        onClick={() => void deleteOne(r.id)}
                        className={`p-2 rounded-xl border transition-all mr-2 ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                        title="Mesajı sil"
                      >
                        <Trash2 size={13}/>
                      </button>
                    )}
                    <button
                      onClick={() => setComposeAudience({ type: "single", userId: r.to_user_id, label })}
                      className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      title="Yanıtla"
                    >
                      <Reply size={13}/>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {composeAudience !== undefined && (
        <SendNotificationModal
          defaultAudience={composeAudience ?? undefined}
          isDark={isDark}
          onClose={() => setComposeAudience(undefined)}
          onSent={() => void load(view)}
        />
      )}
    </div>
  );
}
