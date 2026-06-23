"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Loader2, MapPin, Send } from "lucide-react";
import PublicLocaleToggle from "@/components/public/PublicLocaleToggle";
import { bookingCopy, formatPublicDate } from "@/lib/public-copy";
import type { PublicLocale } from "@/lib/public-locale";
import type { BookingConfig } from "@/lib/smart-qr";

type Props = {
  slug: string;
  qrId: string;
  title: string;
  config: BookingConfig;
  locale: PublicLocale;
};

function dateRange(from: string, to: string) {
  if (!from || !to) return [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(+start) || Number.isNaN(+end) || start > end) return [];
  const days: string[] = [];
  for (const d = new Date(start); d <= end && days.length < 60; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function timeSlots(from: string, to: string, duration: number) {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if (![fh, fm, th, tm].every(Number.isFinite)) return [];
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  if (start >= end) return [];
  const slots: string[] = [];
  for (let m = start; m + duration <= end && slots.length < 96; m += duration) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
}

export default function BookingPageClient({ slug, qrId, title, config, locale }: Props) {
  const text = bookingCopy[locale];
  const days = useMemo(() => dateRange(config.dateFrom, config.dateTo), [config.dateFrom, config.dateTo]);
  const slots = useMemo(() => timeSlots(config.timeFrom, config.timeTo, config.durationMinutes), [config.durationMinutes, config.timeFrom, config.timeTo]);
  const [selectedDate, setSelectedDate] = useState(days[0] ?? "");
  const [selectedTime, setSelectedTime] = useState(slots[0] ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setDone("");
    if (!selectedDate || !selectedTime) return setError(text.pickDateTime);
    if (!name.trim()) return setError(text.fullNameRequired);
    if (!email.trim() && !phone.trim()) return setError(text.contactRequired);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          qr_id: qrId,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          note,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : text.submitError);
      setDone(json.message || config.successMessage);
      setName("");
      setEmail("");
      setPhone("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.submitError);
    } finally {
      setLoading(false);
    }
  }

  if (!config.active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <CalendarCheck className="mx-auto text-cyan-300" size={36} />
          <h1 className="mt-4 text-xl font-black">{text.inactiveTitle}</h1>
          <p className="mt-2 text-sm text-slate-300">{text.inactiveBody}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ecfeff,#f8fafc)] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex justify-end">
          <PublicLocaleToggle initialLocale={locale} />
        </div>

        <section className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-cyan-900/20 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{config.serviceType || text.defaultServiceType}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{config.title || title}</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-300">{config.description}</p>
          <div className="mt-5 grid gap-2 text-sm font-bold sm:grid-cols-2">
            <span className="rounded-2xl bg-white/10 px-3 py-2"><MapPin size={15} className="mr-1 inline" />{config.location || config.onlineUrl || text.locationFallback}</span>
            <span className="rounded-2xl bg-white/10 px-3 py-2">{config.durationMinutes} {text.minuteShort} · {text.capacity} {config.capacity} · {config.timezone}</span>
          </div>
        </section>

        <section className="mt-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6">
          {done && <div className="mb-4 flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><CheckCircle2 size={18} />{done}</div>}
          {error && <div className="mb-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"><AlertCircle size={18} />{error}</div>}

          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">{text.dateLabel}</p>
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                {days.length === 0 ? <p className="text-sm font-semibold text-slate-500">{text.dateMissing}</p> : days.map(day => (
                  <button key={day} onClick={() => setSelectedDate(day)} className={`rounded-2xl border px-3 py-3 text-left text-sm font-black ${selectedDate === day ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-700"}`}>
                    {formatPublicDate(day, locale)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">{text.timeLabel}</p>
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                  {slots.map(slot => (
                    <button key={slot} onClick={() => setSelectedTime(slot)} className={`rounded-xl border px-3 py-2 text-sm font-black ${selectedTime === slot ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{slot}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder={text.fullName} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={text.email} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={text.phone} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500" />
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={text.note} rows={3} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500 sm:col-span-2" />
              </div>
              <button disabled={loading} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} {loading ? text.sending : text.sendRequest}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
