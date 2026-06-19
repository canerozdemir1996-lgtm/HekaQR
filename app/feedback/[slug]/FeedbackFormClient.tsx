"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, MapPin, Send, ShieldCheck } from "lucide-react";
import {
  FEEDBACK_KIND_LABEL,
  FEEDBACK_PRIORITY_LABEL,
  buildLocationLabel,
  type FeedbackConfig,
  type FeedbackKind,
  type FeedbackPriority,
} from "@/lib/feedback";

const TOPICS = [
  "Temizlik",
  "Teknik arıza",
  "Güvenlik",
  "Personel",
  "Bekleme süresi",
  "Yönlendirme",
  "Diğer",
];

export default function FeedbackFormClient({ slug, title, config }: { slug: string; title: string; config: FeedbackConfig }) {
  const categories = config.categories.length > 0 ? config.categories : ["complaint", "suggestion", "request"] as FeedbackKind[];
  const priorities = config.priorities.length > 0 ? config.priorities : ["normal", "high"] as FeedbackPriority[];
  const [kind, setKind] = useState<FeedbackKind>(categories[0] ?? "suggestion");
  const [priority, setPriority] = useState<FeedbackPriority>(priorities[0] ?? "normal");
  const [topic, setTopic] = useState(TOPICS[0]);
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
    return [
      location.campus,
      location.building,
      location.floor,
      location.unit,
      location.room,
      location.asset,
    ].filter(Boolean);
  }, [config.location]);

  async function submit() {
    setError("");
    setDone("");
    if (!message.trim() || message.trim().length < 5) {
      setError("Lütfen en az 5 karakterlik açıklama girin.");
      return;
    }
    setLoading(true);
    try {
      const topicPrefix = `Konu: ${topic}`;
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          kind,
          priority,
          message: `${topicPrefix}\n\n${message.trim()}`,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Gönderilemedi.");
      setDone(json.message || config.successMessage || "Bildiriminiz alındı. Teşekkür ederiz.");
      setMessage("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-md">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
          <div className="bg-gradient-to-br from-cyan-600 via-blue-700 to-violet-800 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">{config.organizationName || "QR Publish"}</p>
                <h1 className="mt-2 text-2xl font-black leading-tight">{config.formTitle || "Şikayet, Öneri ve İstek Formu"}</h1>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <ClipboardCheck size={24} />
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/12 p-3 backdrop-blur">
              <div className="flex items-start gap-2">
                <MapPin size={17} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/65">QR Lokasyonu</p>
                  <p className="mt-1 text-sm font-black leading-snug">{locationLabel}</p>
                </div>
              </div>
              {locationParts.length > 0 && (
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                  {locationParts.map((part) => (
                    <span key={part} className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white/90">
                      {part}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5 p-5">
            {done && (
              <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0" /> {done}
              </div>
            )}
            {error && (
              <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                <AlertCircle size={18} className="shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Bildirim Türü</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setKind(item)}
                    className={`rounded-2xl border px-2 py-3 text-xs font-black transition ${kind === item ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {FEEDBACK_KIND_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Konu</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TOPICS.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTopic(item)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${topic === item ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Öncelik</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {priorities.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPriority(item)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${priority === item ? "border-rose-500 bg-rose-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {FEEDBACK_PRIORITY_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Açıklama</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Şikayet, öneri veya isteğinizi kısa ve net yazın..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            {config.allowContact && (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-2 text-xs font-bold text-slate-500">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  İletişim bilgisi {config.requireContact ? "zorunlu" : "opsiyonel"}. Sadece geri dönüş için kullanılır.
                </div>
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ad soyad" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-blue-500" />
                <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder={config.requireContact ? "E-posta veya telefon zorunlu" : "E-posta"} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-blue-500" />
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Telefon" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-blue-500" />
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Gönder
            </button>

            <p className="text-center text-[11px] font-semibold text-slate-400">
              Bu form ilgili lokasyon QR kodu üzerinden otomatik eşleştirilir.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
