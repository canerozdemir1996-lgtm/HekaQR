"use client";

import { useEffect, useMemo, useState } from "react";
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

type PublicBooking = {
  id: string;
  status: "new" | "in_progress" | "completed" | "cancelled";
  appointment_date?: string | null;
  appointment_time?: string | null;
  customer_name?: string | null;
  customer_message?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AvailabilitySlot = { count: number; remaining: number; disabled: boolean };
type Availability = Record<string, Record<string, AvailabilitySlot>>;

const STATUS_LABEL: Record<PublicBooking["status"], string> = {
  new: "Talep alındı",
  in_progress: "Onaylandı / hazırlanıyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const TRACKING_KEY_PREFIX = "qr-publish-booking";

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function bookingStorageKey(slug: string) {
  return `${TRACKING_KEY_PREFIX}:${slug}`;
}

function readOrCreatePublicToken(slug: string) {
  if (typeof window === "undefined") return "";
  const key = `${bookingStorageKey(slug)}:token`;
  let token = window.localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(key, token);
  }
  return token;
}

function dateRange(from: string, to: string) {
  if (!from || !to) return [];
  const today = localDateKey();
  const safeFrom = from < today ? today : from;
  const start = new Date(`${safeFrom}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(+start) || Number.isNaN(+end) || start > end) return [];
  const days: string[] = [];
  for (const d = new Date(start); d <= end && days.length < 60; d.setDate(d.getDate() + 1)) {
    days.push(localDateKey(d));
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
  const [publicToken, setPublicToken] = useState("");
  const [availability, setAvailability] = useState<Availability>({});
  const [trackedBooking, setTrackedBooking] = useState<PublicBooking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const activeBooking = trackedBooking && ["new", "in_progress"].includes(trackedBooking.status) ? trackedBooking : null;

  useEffect(() => {
    setPublicToken(readOrCreatePublicToken(slug));
  }, [slug]);

  useEffect(() => {
    if (days.length === 0) {
      setSelectedDate("");
      return;
    }
    if (!days.includes(selectedDate)) setSelectedDate(days[0]);
  }, [days, selectedDate]);

  useEffect(() => {
    if (!selectedDate || slots.length === 0) return;
    const nextAvailable = slots.find(slot => !availability[selectedDate]?.[slot]?.disabled) ?? "";
    if (!nextAvailable) {
      setSelectedTime("");
      return;
    }
    if (!selectedTime || availability[selectedDate]?.[selectedTime]?.disabled) {
      setSelectedTime(nextAvailable);
    }
  }, [availability, selectedDate, selectedTime, slots]);

  useEffect(() => {
    if (days.length === 0) return;
    const from = days[0];
    const to = days[days.length - 1];
    const controller = new AbortController();
    fetch(`/api/v1/bookings?public=1&qr_id=${encodeURIComponent(qrId)}&from=${from}&to=${to}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(json => setAvailability(json.availability ?? {}))
      .catch(() => undefined);
    return () => controller.abort();
  }, [days, qrId]);

  useEffect(() => {
    if (!publicToken) return;
    let stopped = false;
    const loadTracked = async () => {
      setTrackingLoading(true);
      try {
        const res = await fetch(`/api/v1/bookings?public=1&qr_id=${encodeURIComponent(qrId)}&public_token=${encodeURIComponent(publicToken)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        if (!stopped) setTrackedBooking((json.bookings ?? [])[0] ?? null);
      } catch {
        if (!stopped) setTrackedBooking(null);
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
  }, [publicToken, qrId]);

  async function submit() {
    setError("");
    setDone("");
    if (!selectedDate || !selectedTime) return setError(text.pickDateTime);
    if (!name.trim()) return setError(text.fullNameRequired);
    if (!email.trim() && !phone.trim()) return setError(text.contactRequired);
    if (activeBooking) return setError("Aktif bir rezervasyon talebiniz var. Yeni talep için önce mevcut talebi iptal edin.");
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
          public_token: publicToken,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.booking) setTrackedBooking(json.booking as PublicBooking);
        throw new Error(typeof json.error === "string" ? json.error : text.submitError);
      }
      if (json.booking) setTrackedBooking(json.booking as PublicBooking);
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

  async function cancelTrackedBooking() {
    if (!trackedBooking || !publicToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trackedBooking.id, public_token: publicToken, public_action: "cancel" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Rezervasyon iptal edilemedi.");
      setTrackedBooking(json.booking as PublicBooking);
      setDone("Rezervasyon talebiniz iptal edildi. Dilerseniz yeni talep oluşturabilirsiniz.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rezervasyon iptal edilemedi.");
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
          {trackedBooking && (
            <div className="mb-5 rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4 text-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Rezervasyon Takibi</p>
                  <h2 className="mt-1 text-lg font-black">{STATUS_LABEL[trackedBooking.status] ?? "Talep alındı"}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {trackedBooking.appointment_date ? formatPublicDate(trackedBooking.appointment_date, locale) : "-"} · {trackedBooking.appointment_time?.slice(0, 5) || "-"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${trackedBooking.status === "cancelled" ? "bg-slate-200 text-slate-700" : trackedBooking.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                  {STATUS_LABEL[trackedBooking.status] ?? trackedBooking.status}
                </span>
              </div>
              {(trackedBooking.customer_message || trackedBooking.admin_note) && (
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  {trackedBooking.customer_message || trackedBooking.admin_note}
                </p>
              )}
              {activeBooking && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={cancelTrackedBooking} disabled={loading} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50">
                    İptal et ve yeniden oluştur
                  </button>
                  <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">
                    {trackingLoading ? "Durum güncelleniyor..." : "Bu talep açıkken yeni kayıt alınmaz."}
                  </span>
                </div>
              )}
            </div>
          )}

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
                  {slots.map(slot => {
                    const state = availability[selectedDate]?.[slot];
                    const disabled = state?.disabled === true;
                    return (
                      <button
                        key={slot}
                        disabled={disabled}
                        onClick={() => setSelectedTime(slot)}
                        className={`rounded-xl border px-3 py-2 text-sm font-black ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through opacity-60" : selectedTime === slot ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                        title={disabled ? "Bu saat dolu" : state ? `${state.remaining} kontenjan kaldı` : undefined}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder={text.fullName} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={text.email} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={text.phone} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500" />
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={text.note} rows={3} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 sm:col-span-2" />
              </div>
              <button disabled={loading || Boolean(activeBooking)} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} {loading ? text.sending : text.sendRequest}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
