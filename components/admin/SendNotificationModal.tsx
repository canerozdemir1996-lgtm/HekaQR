"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Send, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/supabase";
import { PLAN_LABEL, type PlanKey } from "@/lib/plan-limits";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const BODY_MAX_LENGTH = 500;

type AudienceType = "single" | "plan" | "organization" | "all";

type AdminUserOption = { id: string; email: string; full_name?: string | null };
type OrgOption = { id: string; name: string; member_count: number };

export type DefaultAudience =
  | { type: "single"; userId: string; label: string }
  | { type: "plan"; plan: PlanKey }
  | { type: "organization"; orgId: string }
  | { type: "all" };

const PLAN_KEYS: PlanKey[] = ["free", "starter", "pro", "enterprise"];

export function SendNotificationModal({
  defaultAudience,
  isDark,
  onClose,
  onSent,
}: {
  defaultAudience?: DefaultAudience;
  isDark: boolean;
  onClose: () => void;
  onSent: (result: { sent: number; label: string }) => void;
}) {
  const [audienceType, setAudienceType] = useState<AudienceType>(defaultAudience?.type ?? "single");

  const [singleUserId, setSingleUserId] = useState(defaultAudience?.type === "single" ? defaultAudience.userId : "");
  const [singleUserLabel, setSingleUserLabel] = useState(defaultAudience?.type === "single" ? defaultAudience.label : "");
  const [userOptions, setUserOptions] = useState<AdminUserOption[] | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const [plan, setPlan] = useState<PlanKey>(defaultAudience?.type === "plan" ? defaultAudience.plan : "pro");

  const [orgId, setOrgId] = useState(defaultAudience?.type === "organization" ? defaultAudience.orgId : "");
  const [orgOptions, setOrgOptions] = useState<OrgOption[] | null>(null);

  const [title, setTitle] = useState("System Owner");
  const [body, setBody] = useState("");
  const [bodyTextLength, setBodyTextLength] = useState(0);
  const [kind, setKind] = useState<"small" | "big">("small");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState<{ count: number; label: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const lockSingleTarget = defaultAudience?.type === "single";

  const audience = useMemo(() => {
    if (audienceType === "single") return singleUserId ? { type: "single" as const, userId: singleUserId } : null;
    if (audienceType === "plan") return { type: "plan" as const, plan };
    if (audienceType === "organization") return orgId ? { type: "organization" as const, orgId } : null;
    return { type: "all" as const };
  }, [audienceType, singleUserId, plan, orgId]);

  useEffect(() => {
    if (audienceType !== "single" || lockSingleTarget || userOptions !== null) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/users", { headers: await getAuthHeaders() });
        const json = await res.json();
        setUserOptions((json.users ?? []) as AdminUserOption[]);
      } catch {
        setUserOptions([]);
      }
    })();
  }, [audienceType, lockSingleTarget, userOptions]);

  useEffect(() => {
    if (audienceType !== "organization" || orgOptions !== null) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/organizations", { headers: await getAuthHeaders() });
        const json = await res.json();
        setOrgOptions((json.organizations ?? []) as OrgOption[]);
      } catch {
        setOrgOptions([]);
      }
    })();
  }, [audienceType, orgOptions]);

  useEffect(() => {
    if (!audience) { setPreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    setConfirmingAll(false);
    (async () => {
      try {
        const res = await fetch(`/api/admin/messages?dryRun=1&audience=${encodeURIComponent(JSON.stringify(audience))}`, {
          headers: await getAuthHeaders(),
        });
        const json = await res.json();
        if (!cancelled) setPreview(res.ok ? { count: json.count, label: json.label } : null);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [audience]);

  const filteredUsers = useMemo(() => {
    if (!userOptions) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return userOptions.slice(0, 30);
    return userOptions.filter(u => u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)).slice(0, 30);
  }, [userOptions, userSearch]);

  const send = useCallback(async () => {
    if (!audience || bodyTextLength === 0) return;
    if (audienceType === "all" && !confirmingAll) { setConfirmingAll(true); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ audience, title, body, popup_kind: kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      onSent({ sent: json.sent ?? 0, label: json.label ?? "" });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }, [audience, audienceType, confirmingAll, bodyTextLength, title, body, kind, onSent, onClose]);

  const inp = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400";
  const pillWrap = `flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`;
  const pillBase = `px-3 py-1.5 rounded-lg text-xs font-black transition-all`;
  const label = `text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`;

  const audienceTabs: { key: AudienceType; text: string }[] = [
    { key: "single", text: "Tek kullanıcı" },
    { key: "plan", text: "Plana göre" },
    { key: "organization", text: "Organizasyona göre" },
    { key: "all", text: "Tümü" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 animate-scalein max-h-[90vh] overflow-y-auto ${isDark ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-black text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Bildirim Gönder</h3>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={15}/>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
            <X size={13}/> {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={label}>Hedef kitle</label>
            {lockSingleTarget ? (
              <p className={`text-xs mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Hedef: <b>{singleUserLabel}</b>
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {audienceTabs.map(tab => (
                  <button key={tab.key} type="button" onClick={() => setAudienceType(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      audienceType === tab.key
                        ? "bg-violet-600 text-white border-violet-600"
                        : isDark ? "text-slate-400 border-white/10 hover:text-violet-300" : "text-slate-500 border-slate-200 hover:text-violet-600"
                    }`}>
                    {tab.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!lockSingleTarget && audienceType === "single" && (
            <div>
              <div className="relative">
                <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`}/>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="E-posta veya isimle ara…"
                  className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${inp}`} />
              </div>
              <div className={`mt-2 max-h-40 overflow-y-auto rounded-xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
                {userOptions === null ? (
                  <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-violet-400"/></div>
                ) : filteredUsers.length === 0 ? (
                  <p className={`text-xs py-4 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>Kullanıcı bulunamadı</p>
                ) : (
                  filteredUsers.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => { setSingleUserId(u.id); setSingleUserLabel(u.full_name ? `${u.full_name} · ${u.email}` : u.email); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-all ${
                        singleUserId === u.id
                          ? "bg-violet-600 text-white"
                          : isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                      }`}>
                      {u.full_name ? `${u.full_name} · ${u.email}` : u.email}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {audienceType === "plan" && (
            <select value={plan} onChange={e => setPlan(e.target.value as PlanKey)}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}>
              {PLAN_KEYS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
            </select>
          )}

          {audienceType === "organization" && (
            <select value={orgId} onChange={e => setOrgId(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}>
              <option value="">Organizasyon seçin…</option>
              {(orgOptions ?? []).map(o => <option key={o.id} value={o.id}>{o.name} ({o.member_count} üye)</option>)}
            </select>
          )}

          {audience && (
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {previewLoading ? "Alıcı sayısı hesaplanıyor…" : preview ? (
                <>Bu mesaj <b>{preview.count} kullanıcıya</b> gönderilecek.</>
              ) : null}
            </p>
          )}

          <div>
            <label className={label}>Popup tipi</label>
            <div className="mt-2 flex items-center gap-2">
              <div className={pillWrap}>
                <button type="button" onClick={() => setKind("small")}
                  className={`${pillBase} ${kind === "small" ? "bg-violet-600 text-white" : (isDark ? "text-slate-400 hover:text-violet-300" : "text-slate-500 hover:text-violet-600")}`}>
                  Küçük
                </button>
                <button type="button" onClick={() => setKind("big")}
                  className={`${pillBase} ${kind === "big" ? "bg-red-600 text-white" : (isDark ? "text-slate-400 hover:text-red-300" : "text-slate-500 hover:text-red-600")}`}>
                  Büyük ikaz
                </button>
              </div>
              <span className={`text-[11px] ${isDark ? "text-slate-600" : "text-slate-500"}`}>
                {kind === "big" ? "Ekran ortasında büyük uyarı" : "Sağ üstte küçük popup"}
              </span>
            </div>
          </div>
          <div>
            <label className={label}>Başlık</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              className={`w-full mt-1 border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`} />
          </div>
          <div>
            <label className={label}>Mesaj</label>
            <div className="mt-1">
              <RichTextEditor
                value={body}
                onChange={(html, textLength) => { setBody(html); setBodyTextLength(textLength); }}
                onError={setError}
                isDark={isDark}
                placeholder="Kullanıcıya gösterilecek mesaj…"
                maxLength={BODY_MAX_LENGTH}
              />
            </div>
            <p className={`text-[10px] mt-1 ${isDark ? "text-slate-600" : "text-slate-500"}`}>{bodyTextLength}/{BODY_MAX_LENGTH}</p>
          </div>
        </div>

        {confirmingAll && (
          <div className="mt-4 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
            Bu işlem geri alınamaz. <b>{preview?.count ?? 0} kullanıcının</b> tümüne gönderilecek.
          </div>
        )}

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-white/20 hover:text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            İptal
          </button>
          <button onClick={send} disabled={loading || bodyTextLength === 0 || !audience}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-premium focus-premium">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
            {confirmingAll ? `Evet, ${preview?.count ?? 0} kullanıcıya gönder` : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}
