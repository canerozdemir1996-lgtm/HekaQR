"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, MapPin, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import PublicLocaleToggle from "@/components/public/PublicLocaleToggle";
import HorizontalScroller from "@/components/HorizontalScroller";
import { buildLocationLabel, type FeedbackConfig, type FeedbackKind } from "@/lib/feedback";
import { feedbackCopy, feedbackKindLabels } from "@/lib/public-copy";
import type { PublicLocale } from "@/lib/public-locale";

type Props = {
  slug?: string;
  qrId?: string;
  deviceId?: string;
  title: string;
  config: FeedbackConfig;
  locale: PublicLocale;
};

type TrackedFeedback = {
  id: string;
  status: "new" | "in_progress" | "completed" | "cancelled";
  subject?: string | null;
  message?: string | null;
  customer_message?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
};

const TRACKING_KEY_PREFIX = "qr-publish-feedback";
const STATUS_LABEL: Record<TrackedFeedback["status"], string> = {
  new: "Bildirim alındı",
  in_progress: "İnceleniyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

function trackingKey(slug?: string, qrId?: string) {
  return `${TRACKING_KEY_PREFIX}:${slug || qrId || "form"}`;
}

function readOrCreatePublicToken(slug?: string, qrId?: string) {
  if (typeof window === "undefined") return "";
  const key = `${trackingKey(slug, qrId)}:token`;
  let token = window.localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(key, token);
  }
  return token;
}

export default function FeedbackFormClient({ slug, qrId, deviceId, title, config, locale }: Props) {
  const text = feedbackCopy[locale];
  const kindLabels = feedbackKindLabels[locale];
  const categories = config.categories.length > 0 ? config.categories : ["complaint", "suggestion", "request"] as FeedbackKind[];
  const [kind, setKind] = useState<FeedbackKind>(categories[0] ?? "suggestion");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [publicToken, setPublicToken] = useState("");
  const [trackedFeedback, setTrackedFeedback] = useState<TrackedFeedback | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const activeFeedback = trackedFeedback && ["new", "in_progress"].includes(trackedFeedback.status) ? trackedFeedback : null;

  const locationLabel = useMemo(() => config.locationLabel || buildLocationLabel(config.location) || title, [config.location, config.locationLabel, title]);
  const locationParts = useMemo(() => {
    const location = config.location;
    return [location.campus, location.building, location.floor, location.unit, location.room, location.asset].filter(Boolean);
  }, [config.location]);
  const subjectLimitLabel = selectedSubjects.length > 0
    ? text.currentSelection(selectedSubjects.length, config.maxSelections)
    : text.maxSelection(config.maxSelections);

  useEffect(() => {
    setPublicToken(readOrCreatePublicToken(slug, qrId));
  }, [qrId, slug]);

  useEffect(() => {
    if (!publicToken) return;
    let stopped = false;
    const loadTracked = async () => {
      setTrackingLoading(true);
      try {
        const query = new URLSearchParams({ public: "1", public_token: publicToken });
        if (qrId) query.set("qr_id", qrId);
        if (slug) query.set("slug", slug);
        const res = await fetch(`/api/v1/feedback?${query.toString()}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        if (!stopped) setTrackedFeedback((json.submissions ?? [])[0] ?? null);
      } catch {
        if (!stopped) setTrackedFeedback(null);
      } finally {
        if (!stopped) setTrackingLoading(false);
      }
    };
    void loadTracked();
    const interval = window.setInterval(loadTracked, 10000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [publicToken, qrId, slug]);

  function toggleSubject(subject: string) {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) return prev.filter(item => item !== subject);
      if (prev.length >= config.maxSelections) return prev;
      return [...prev, subject];
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]);
  }

  function resetForm() {
    setSelectedSubjects([]);
    setSelectedTags([]);
    setMessage("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setKind(categories[0] ?? "suggestion");
    setError("");
  }

  async function submit() {
    setError("");
    setDone("");
    if (activeFeedback) {
      setError("Bu QR için aktif bir bildiriminiz var. Yeni bildirim için önce mevcut bildirimi iptal edin.");
      return;
    }
    if (config.requiredFields.subject && selectedSubjects.length === 0) {
      setError(text.pickSubjectError);
      return;
    }
    if (config.requiredFields.message && message.trim().length < 5 && kind !== "thanks") {
      setError(text.messageError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          qr_id: qrId,
          device_id: deviceId,
          type: kind,
          subject: selectedSubjects[0] ?? "",
          subjects: selectedSubjects,
          tags: selectedTags,
          message: message.trim(),
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          public_token: publicToken,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.submission) setTrackedFeedback(json.submission as TrackedFeedback);
        throw new Error(typeof json.error === "string" ? json.error : text.submitError);
      }
      if (json.submission) setTrackedFeedback(json.submission as TrackedFeedback);
      setDone(json.message || config.successMessage || text.successFallback);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : text.submitError);
    } finally {
      setLoading(false);
    }
  }

  async function cancelTrackedFeedback() {
    if (!trackedFeedback || !publicToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trackedFeedback.id, public_token: publicToken, public_action: "cancel" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Bildirim iptal edilemedi.");
      setTrackedFeedback(json.submission as TrackedFeedback);
      setDone("Bildiriminiz iptal edildi. Dilerseniz yeni bildirim gönderebilirsiniz.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bildirim iptal edilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!config.formActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl">
          <ClipboardCheck className="mx-auto text-cyan-300" size={34} />
          <h1 className="mt-4 text-xl font-black">{text.formClosedTitle}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">{text.formClosedBody}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_left,#dff9ff,transparent_34%),linear-gradient(180deg,#eef7ff,#f8fbff_42%,#eef6ff)] px-3 py-4 text-slate-950 sm:px-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex justify-end">
          <PublicLocaleToggle initialLocale={locale} />
        </div>

        <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-teal-700 via-cyan-600 to-sky-500 p-4 text-white shadow-xl shadow-cyan-900/15 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">{config.organizationName || "QR Publish"}</p>
              <h1 className="mt-1 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">{config.formTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-white/85">{config.description}</p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white/16 px-4 py-3 text-xs font-black backdrop-blur">
              {text.selection} <span className="rounded-full bg-white/25 px-2 py-0.5">{selectedSubjects.length}</span> / {config.maxSelections}
            </div>
          </div>
        </header>

        <section className="mt-3 rounded-2xl border border-cyan-900/10 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-start gap-2">
            <MapPin size={17} className="mt-0.5 shrink-0 text-cyan-700" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{text.qrLocation}</p>
              <p className="mt-1 break-words text-sm font-black text-slate-900">{locationLabel}</p>
              {deviceId && <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">Device ID: {deviceId}</p>}
            </div>
          </div>
          {locationParts.length > 0 && (
            <HorizontalScroller
              ariaLabel="Lokasyon kırıntıları"
              showArrows={false}
              scrollPadding="sm"
              className="-mx-3 mt-3"
              contentClassName="gap-1.5 py-1"
              viewportClassName="pb-1"
            >
              {locationParts.map((part) => (
                <span key={part} className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-800 ring-1 ring-cyan-100">
                  {part}
                </span>
              ))}
            </HorizontalScroller>
          )}
        </section>

        <section className="mt-4 rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-4 shadow-2xl shadow-slate-200/70 backdrop-blur sm:p-5">
          {done && (
            <div className="mb-4 flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0" /> {done}
            </div>
          )}
          {error && (
            <div className="mb-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}

          {trackedFeedback && (
            <div className="mb-4 rounded-3xl border border-cyan-100 bg-cyan-50/80 p-4 text-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Bildirim Takibi</p>
                  <h2 className="mt-1 text-lg font-black">{STATUS_LABEL[trackedFeedback.status] ?? "Bildirim alındı"}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{trackedFeedback.subject || trackedFeedback.message || "Genel bildirim"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${trackedFeedback.status === "cancelled" ? "bg-slate-200 text-slate-700" : trackedFeedback.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                  {STATUS_LABEL[trackedFeedback.status] ?? trackedFeedback.status}
                </span>
              </div>
              {(trackedFeedback.customer_message || trackedFeedback.admin_note) && (
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  {trackedFeedback.customer_message || trackedFeedback.admin_note}
                </p>
              )}
              {activeFeedback && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={cancelTrackedFeedback} disabled={loading} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50">
                    İptal et ve yeniden gönder
                  </button>
                  <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">
                    {trackingLoading ? "Durum güncelleniyor..." : "Bu bildirim açıkken tekrar gönderim kapalıdır."}
                  </span>
                </div>
              )}
            </div>
          )}

          {config.positiveFeedbackEnabled && (
            <button
              type="button"
              onClick={() => {
                setKind("thanks");
                setSelectedSubjects(prev => prev.includes(config.positiveFeedbackLabel) ? prev.filter(item => item !== config.positiveFeedbackLabel) : [config.positiveFeedbackLabel]);
              }}
              className={`mb-4 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${kind === "thanks" ? "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-200"}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Sparkles size={19} />
              </span>
              <span>
                <span className="block text-sm font-black">{text.positiveFeedbackTitle}</span>
                <span className="block text-xs font-semibold text-slate-500">{config.positiveFeedbackLabel}</span>
              </span>
            </button>
          )}

          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{text.feedbackType}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
                  {categories.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setKind(item)}
                      className={`rounded-2xl border px-3 py-3 text-xs font-black transition ${kind === item ? "border-cyan-600 bg-cyan-600 text-white shadow-lg shadow-cyan-600/20" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200"}`}
                    >
                      {kindLabels[item]}
                    </button>
                  ))}
                </div>
              </div>

              {config.tags.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{text.tags}</label>
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {config.tags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${selectedTags.includes(tag) ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">{text.subjectSelection}</label>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-800">{subjectLimitLabel}</span>
                </div>
                <div className="grid max-h-[42vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {config.subjects.map(item => {
                    const active = selectedSubjects.includes(item);
                    const locked = !active && selectedSubjects.length >= config.maxSelections;
                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleSubject(item)}
                        className={`flex min-h-[58px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${active ? "border-cyan-400 bg-cyan-50 shadow-[0_0_0_3px_rgba(34,211,238,0.14)]" : "border-slate-200 bg-white hover:border-slate-300"} ${locked ? "cursor-not-allowed opacity-45" : ""}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${active ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-200 bg-white"}`}>
                          {active && <CheckCircle2 size={13} />}
                        </span>
                        <span>
                          <span className="block text-sm font-black text-slate-900">{item}</span>
                          <span className="block text-xs font-semibold text-slate-500">{text.tapToSelect}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                  {text.extraMessage} {config.requiredFields.message ? "" : `(${text.optional})`}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder={text.messagePlaceholder}
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500"
                />
                <p className="mt-2 text-[11px] font-semibold text-slate-500">{config.privacyNotice}</p>
              </div>

              {config.allowContact && (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-500 sm:col-span-3">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                    {text.contactInfo} {config.requireContact ? text.required : text.optionalSentence}. {config.requireContact ? text.contactHelpRequired : text.contactHelpOptional}
                  </div>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder={text.fullName} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                  <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder={config.requireContact ? text.emailOrPhoneRequired : text.email} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                  <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder={text.phone} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <X size={16} /> {config.resetButtonText}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading || Boolean(activeFeedback)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:cursor-wait disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {config.submitButtonText}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 pb-6 sm:grid-cols-3">
          {[
            [text.howItWorks, text.howItWorksBody],
            [text.selectionLimit, text.maxSelection(config.maxSelections)],
            [text.privacy, text.privacyBody],
          ].map(([head, body]) => (
            <div key={head} className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm">
              <p className="text-sm font-black text-slate-900">{head}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
