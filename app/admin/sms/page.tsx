"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSupabaseSession";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareText, Search, Send, Settings, XCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { PLAN_LABEL, type PlanKey } from "@/lib/plan-limits";

const MESSAGE_MAX_LENGTH = 459;
const PLAN_KEYS: PlanKey[] = ["free", "starter", "pro", "enterprise"];

type AudienceType = "users" | "plan" | "organization" | "all";
type UserOption = { id: string; email: string; full_name?: string | null; phone?: string | null };
type OrgOption = { id: string; name: string; member_count: number };
type SendResult = { sent: number; failed: number; skipped_no_phone: number; label: string };

export default function AdminSmsPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { data: session, status } = useSession();
  const [actorOk, setActorOk] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  type ProviderStatus = { provider: string; configured: boolean; label: string };
  const [smsStatus, setSmsStatus] = useState<{ providers: ProviderStatus[]; activeProvider: string; testMode: boolean; configured: boolean } | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; provider?: string; error?: string } | null>(null);
  const [testSending, setTestSending] = useState(false);

  const [audienceType, setAudienceType] = useState<AudienceType>("users");
  const [userOptions, setUserOptions] = useState<UserOption[] | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const [plan, setPlan] = useState<PlanKey>("pro");
  const [orgId, setOrgId] = useState("");
  const [orgOptions, setOrgOptions] = useState<OrgOption[] | null>(null);

  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ count: number; withPhone: number; label: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user.role as "admin" | "owner" | "user" | undefined) || "user";
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (role !== "owner") { setForbidden(true); return; }
    setActorOk(true);
  }, [router, session, status]);

  useEffect(() => {
    if (!actorOk) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/sms?status=1", { headers: await getAuthHeaders() });
        if (res.ok) setSmsStatus(await res.json());
      } catch { /* non-fatal */ }
    })();
  }, [actorOk]);

  const sendTestSms = useCallback(async () => {
    if (!testPhone.trim()) return;
    setTestSending(true); setTestResult(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ test: true, to: testPhone.trim(), message: "QR Publish SMS test mesajı." }),
      });
      const json = await res.json();
      setTestResult(res.ok ? { ok: json.ok, provider: json.provider } : { ok: false, error: json.error });
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : "Hata" });
    } finally { setTestSending(false); }
  }, [testPhone]);

  useEffect(() => {
    if (userOptions !== null) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/sms?listUsers=1", { headers: await getAuthHeaders() });
        const json = await res.json();
        setUserOptions((json.users ?? []) as UserOption[]);
      } catch {
        setUserOptions([]);
      }
    })();
  }, [userOptions]);

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

  const audience = useMemo(() => {
    if (audienceType === "users") return selectedUserIds.size > 0 ? { type: "users" as const, userIds: Array.from(selectedUserIds) } : null;
    if (audienceType === "plan") return { type: "plan" as const, plan };
    if (audienceType === "organization") return orgId ? { type: "organization" as const, orgId } : null;
    return { type: "all" as const };
  }, [audienceType, selectedUserIds, plan, orgId]);

  useEffect(() => {
    if (!audience) { setPreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    setConfirmingAll(false);
    (async () => {
      try {
        const res = await fetch(`/api/admin/sms?dryRun=1&audience=${encodeURIComponent(JSON.stringify(audience))}`, {
          headers: await getAuthHeaders(),
        });
        const json = await res.json();
        if (!cancelled) setPreview(res.ok ? { count: json.count, withPhone: json.withPhone, label: json.label } : null);
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
    if (!q) return userOptions.slice(0, 60);
    return userOptions.filter(u => u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)).slice(0, 60);
  }, [userOptions, userSearch]);

  const toggleUser = useCallback((id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    if (!audience || !message.trim()) return;
    if (audienceType === "all" && !confirmingAll) { setConfirmingAll(true); return; }
    setError(""); setResult(null); setSending(true);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ audience, message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      setResult({ sent: json.sent, failed: json.failed, skipped_no_phone: json.skipped_no_phone, label: json.label });
      setMessage("");
      setSelectedUserIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setSending(false);
    }
  }, [audience, audienceType, confirmingAll, message]);

  const surface = isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white";
  const inp = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  if (forbidden) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className={`mx-auto max-w-2xl rounded-2xl border p-6 ${surface}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
            <div>
              <h1 className="text-xl font-black">SMS gönderimi yalnızca hesap sahibine açık</h1>
              <p className={`mt-2 text-sm font-semibold leading-relaxed ${muted}`}>
                Admin kullanıcılar SMS gönderim ekranını görüntüleyemez. Kullanıcı yönetimi, analitik ve diğer admin araçları için admin panelini kullanmaya devam edebilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-500"
              >
                Admin Paneline Dön
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!actorOk) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-violet-600" /></main>;

  const audienceTabs: { key: AudienceType; text: string }[] = [
    { key: "users", text: "Kullanıcı seç" },
    { key: "plan", text: "Plana göre" },
    { key: "organization", text: "Organizasyona göre" },
    { key: "all", text: "Tümü" },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className={`text-xs font-black uppercase tracking-wider ${muted}`}>Admin Panel</p>
          <h1 className="text-2xl font-black flex items-center gap-2"><MessageSquareText className="text-violet-500" /> SMS Gönder</h1>
          <p className={`mt-1 text-sm font-semibold ${muted}`}>Seçtiğiniz kullanıcılara, profillerinde kayıtlı telefon numarasına SMS gönderir.</p>
        </header>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            <XCircle size={16} /> {error}
          </div>
        )}
        {result && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>
              <b>{result.label}</b> — {result.sent} gönderildi, {result.failed} başarısız, {result.skipped_no_phone} telefon numarası yok.
            </span>
          </div>
        )}

        {/* SMS Provider Durumu */}
        <section className={`rounded-2xl border p-5 mb-5 ${surface}`}>
          <div className="flex items-center gap-2 mb-3">
            <Settings size={14} className="text-violet-400" />
            <span className={`text-xs font-black uppercase tracking-wider ${muted}`}>SMS Provider Durumu</span>
          </div>
          {!smsStatus ? (
            <Loader2 size={14} className="animate-spin text-violet-400" />
          ) : (
            <div className="space-y-3">
              {smsStatus.testMode && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                  <AlertTriangle size={13} /> <strong>TEST MODU AÇIK</strong> — SMS_TEST_MODE=true, gerçek SMS gönderilmez.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {smsStatus.providers.map(p => (
                  <div key={p.provider} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                    p.configured
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : isDark ? "border-white/10 text-slate-600" : "border-slate-200 text-slate-400"
                  }`}>
                    {p.configured
                      ? <CheckCircle2 size={12} />
                      : <XCircle size={12} />}
                    {p.label}
                    {p.configured && p.provider === smsStatus.activeProvider && (
                      <span className="ml-auto text-[9px] font-black bg-emerald-500/20 px-1.5 py-0.5 rounded-full">AKTİF</span>
                    )}
                  </div>
                ))}
              </div>

              {!smsStatus.configured && (
                <div className={`text-xs rounded-xl border px-3 py-2.5 ${isDark ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  Hiçbir SMS sağlayıcı yapılandırılmamış. .env.local dosyasına <code className="font-mono">ILETI_MERKEZI_USERNAME</code> / <code className="font-mono">PASSWORD</code> / <code className="font-mono">SENDER</code> ekleyin, ardından uygulamayı yeniden başlatın.
                </div>
              )}

              {smsStatus.configured && (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="+905xxxxxxxxx"
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition ${inp}`}
                  />
                  <button
                    onClick={() => void sendTestSms()}
                    disabled={testSending || !testPhone.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {testSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Test Gönder
                  </button>
                </div>
              )}
              {testResult && (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                  testResult.ok
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                }`}>
                  {testResult.ok
                    ? <><CheckCircle2 size={12} /> Test SMS gönderildi! Provider: {testResult.provider}</>
                    : <><XCircle size={12} /> {testResult.error}</>}
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`rounded-2xl border p-5 ${surface}`}>
          <label className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Hedef kitle</label>
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

          {audienceType === "users" && (
            <div className="mt-4">
              <div className="relative">
                <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="E-posta veya isimle ara…"
                  className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${inp}`} />
              </div>
              {selectedUserIds.size > 0 && (
                <p className={`mt-2 text-xs font-bold text-violet-500`}>{selectedUserIds.size} kullanıcı seçildi</p>
              )}
              <div className={`mt-2 max-h-64 overflow-y-auto rounded-xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
                {userOptions === null ? (
                  <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-violet-400" /></div>
                ) : filteredUsers.length === 0 ? (
                  <p className={`text-xs py-4 text-center ${muted}`}>Kullanıcı bulunamadı</p>
                ) : (
                  filteredUsers.map(u => (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={`flex w-full items-center justify-between gap-2 text-left px-3 py-2 text-xs transition-all ${
                        selectedUserIds.has(u.id)
                          ? "bg-violet-600 text-white"
                          : isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                      }`}>
                      <span className="truncate">{u.full_name ? (u.email ? `${u.full_name} · ${u.email}` : u.full_name) : (u.email || u.id)}</span>
                      {!u.phone && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${selectedUserIds.has(u.id) ? "bg-white/20" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"}`}>Telefon yok</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {audienceType === "plan" && (
            <select value={plan} onChange={e => setPlan(e.target.value as PlanKey)}
              className={`mt-4 w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}>
              {PLAN_KEYS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
            </select>
          )}

          {audienceType === "organization" && (
            <select value={orgId} onChange={e => setOrgId(e.target.value)}
              className={`mt-4 w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}>
              <option value="">Organizasyon seçin…</option>
              {(orgOptions ?? []).map(o => <option key={o.id} value={o.id}>{o.name} ({o.member_count} üye)</option>)}
            </select>
          )}

          {audience && (
            <p className={`mt-3 text-xs ${muted}`}>
              {previewLoading ? "Hesaplanıyor…" : preview ? (
                <>Toplam <b>{preview.count}</b> kullanıcı, bunlardan <b>{preview.withPhone}</b> tanesinde telefon numarası var.</>
              ) : null}
            </p>
          )}

          <div className="mt-5">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Mesaj</label>
            <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, MESSAGE_MAX_LENGTH))} rows={4}
              placeholder="Gönderilecek SMS metni…"
              className={`mt-1 w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`} />
            <p className={`mt-1 text-[10px] ${muted}`}>{message.length}/{MESSAGE_MAX_LENGTH}</p>
          </div>

          {confirmingAll && (
            <div className="mt-4 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs">
              Bu işlem geri alınamaz. <b>{preview?.count ?? 0} kullanıcının</b> tümüne SMS gönderilecek.
            </div>
          )}

          <button onClick={() => void send()} disabled={sending || !audience || !message.trim()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-black text-white transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {confirmingAll ? `Evet, ${preview?.count ?? 0} kullanıcıya gönder` : "Gönder"}
          </button>
        </section>
      </div>
    </main>
  );
}
