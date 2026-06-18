"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Send } from "lucide-react";
import {
  FEEDBACK_KIND_LABEL,
  FEEDBACK_PRIORITY_LABEL,
  type FeedbackConfig,
  type FeedbackKind,
  type FeedbackPriority,
} from "@/lib/feedback";

export default function FeedbackFormClient({ slug, title, config }: { slug: string; title: string; config: FeedbackConfig }) {
  const [kind, setKind] = useState<FeedbackKind>(config.categories[0] ?? "suggestion");
  const [priority, setPriority] = useState<FeedbackPriority>(config.priorities[0] ?? "normal");
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setDone("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          kind,
          priority,
          message,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Gönderilemedi.");
      setDone(json.message || config.successMessage);
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
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur">
          <div className="bg-gradient-to-br from-rose-600 via-violet-700 to-slate-950 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
              <MapPin size={13} /> {config.locationLabel || title}
            </div>
            <h1 className="mt-5 text-2xl font-black leading-tight">{config.formTitle}</h1>
            {config.organizationName && <p className="mt-1 text-sm font-semibold text-white/75">{config.organizationName}</p>}
          </div>

          <div className="space-y-4 p-5">
            {done && (
              <div className="flex gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">
                <CheckCircle2 size={18} className="shrink-0" /> {done}
              </div>
            )}
            {error && (
              <div className="flex gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-100">
                <AlertCircle size={18} className="shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Bildirim Türü</label>
              <div className="grid grid-cols-2 gap-2">
                {config.categories.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setKind(item)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-black ${kind === item ? "border-violet-400 bg-violet-500 text-white" : "border-white/10 bg-white/5 text-slate-200"}`}
                  >
                    {FEEDBACK_KIND_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Öncelik</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {config.priorities.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPriority(item)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${priority === item ? "border-rose-300 bg-rose-500 text-white" : "border-white/10 bg-white/5 text-slate-200"}`}
                  >
                    {FEEDBACK_PRIORITY_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Açıklama</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Şikayet, öneri veya isteğinizi yazın..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
              />
            </div>

            {config.allowContact && (
              <div className="grid gap-3">
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ad soyad (opsiyonel)" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-500 focus:border-violet-400" />
                <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder={config.requireContact ? "E-posta veya telefon zorunlu" : "E-posta (opsiyonel)"} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-500 focus:border-violet-400" />
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Telefon (opsiyonel)" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-500 focus:border-violet-400" />
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-slate-950 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Gönder
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
