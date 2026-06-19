"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, MapPin, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  FEEDBACK_KIND_LABEL,
  buildLocationLabel,
  type FeedbackConfig,
  type FeedbackKind,
} from "@/lib/feedback";

type Props = {
  slug?: string;
  qrId?: string;
  deviceId?: string;
  title: string;
  config: FeedbackConfig;
};

export default function FeedbackFormClient({ slug, qrId, deviceId, title, config }: Props) {
  const categories = config.categories.length > 0 ? config.categories : ["complaint", "suggestion", "request"] as FeedbackKind[];
  const [kind, setKind] = useState<FeedbackKind>(categories[0] ?? "suggestion");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const locationLabel = useMemo(() => config.locationLabel || buildLocationLabel(config.location) || title, [config.location, config.locationLabel, title]);
  const locationParts = useMemo(() => {
    const location = config.location;
    return [location.campus, location.building, location.floor, location.unit, location.room, location.asset].filter(Boolean);
  }, [config.location]);
  const subjectLimitLabel = selectedSubjects.length > 0 ? `${selectedSubjects.length} / ${config.maxSelections}` : `En fazla ${config.maxSelections} seçim`;

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
    if (config.requiredFields.subject && selectedSubjects.length === 0) {
      setError("Lütfen en az bir konu seçin.");
      return;
    }
    if (config.requiredFields.message && message.trim().length < 5 && kind !== "thanks") {
      setError("Lütfen en az 5 karakterlik açıklama girin.");
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
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Gönderilemedi.");
      setDone(json.message || config.successMessage || "Bildiriminiz alındı. Teşekkür ederiz.");
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!config.formActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl">
          <ClipboardCheck className="mx-auto text-cyan-300" size={34} />
          <h1 className="mt-4 text-xl font-black">Form şu anda kapalı</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">Bu QR lokasyonu için bildirim alımı geçici olarak durduruldu.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_left,#dff9ff,transparent_34%),linear-gradient(180deg,#eef7ff,#f8fbff_42%,#eef6ff)] px-3 py-4 text-slate-950 sm:px-5">
      <div className="mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-teal-700 via-cyan-600 to-sky-500 p-4 text-white shadow-xl shadow-cyan-900/15 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">{config.organizationName || "QR Publish"}</p>
              <h1 className="mt-1 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">{config.formTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-white/85">{config.description}</p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white/16 px-4 py-3 text-xs font-black backdrop-blur">
              Seçim <span className="rounded-full bg-white/25 px-2 py-0.5">{selectedSubjects.length}</span> / {config.maxSelections}
            </div>
          </div>
        </header>

        <section className="mt-3 rounded-2xl border border-cyan-900/10 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-start gap-2">
            <MapPin size={17} className="mt-0.5 shrink-0 text-cyan-700" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">QR Lokasyonu</p>
              <p className="mt-1 break-words text-sm font-black text-slate-900">{locationLabel}</p>
              {deviceId && <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">Device ID: {deviceId}</p>}
            </div>
          </div>
          {locationParts.length > 0 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {locationParts.map((part) => (
                <span key={part} className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-800 ring-1 ring-cyan-100">
                  {part}
                </span>
              ))}
            </div>
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
                <span className="block text-sm font-black">Pozitif Geri Bildirim</span>
                <span className="block text-xs font-semibold text-slate-500">{config.positiveFeedbackLabel}</span>
              </span>
            </button>
          )}

          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Bildirim Türü</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
                  {categories.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setKind(item)}
                      className={`rounded-2xl border px-3 py-3 text-xs font-black transition ${kind === item ? "border-cyan-600 bg-cyan-600 text-white shadow-lg shadow-cyan-600/20" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200"}`}
                    >
                      {FEEDBACK_KIND_LABEL[item]}
                    </button>
                  ))}
                </div>
              </div>

              {config.tags.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Etiketler</label>
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
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Konu Seçimi</label>
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
                          <span className="block text-xs font-semibold text-slate-500">Dokunarak seçebilirsiniz</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Ek Açıklama {config.requiredFields.message ? "" : "(opsiyonel)"}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Lütfen konuyu kişisel veri paylaşmadan kısa ve net anlatın..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500"
                />
                <p className="mt-2 text-[11px] font-semibold text-slate-500">{config.privacyNotice}</p>
              </div>

              {config.allowContact && (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-500 sm:col-span-3">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                    İletişim bilgisi {config.requireContact ? "zorunlu" : "opsiyonel"}. Sadece geri dönüş için kullanılır.
                  </div>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ad soyad" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                  <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder={config.requireContact ? "E-posta veya telefon zorunlu" : "E-posta"} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                  <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Telefon" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-500" />
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
                  disabled={loading}
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
            ["Nasıl çalışır?", "Seçtiğiniz bildirim QR lokasyonuyla eşleşir ve ilgili panelde takip edilir."],
            ["Seçim limiti", `Aynı anda en fazla ${config.maxSelections} konu seçebilirsiniz.`],
            ["Gizlilik", "Kişisel veri paylaşmayın; bildirim yalnızca süreç takibi için kullanılır."],
          ].map(([head, text]) => (
            <div key={head} className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm">
              <p className="text-sm font-black text-slate-900">{head}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
