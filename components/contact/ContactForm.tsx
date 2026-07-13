"use client";

import { FormEvent, useState } from "react";

const emptyForm = { name: "", email: "", subject: "", message: "", website: "" };

export function ContactForm() {
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Mesaj gonderilemedi.");
      setForm(emptyForm);
      setState("sent");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Mesaj gonderilemedi.");
    }
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white";

  return <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950 dark:shadow-none sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-black text-slate-700 dark:text-slate-200">Ad soyad<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /></label>
      <label className="text-sm font-black text-slate-700 dark:text-slate-200">E-posta<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} /></label>
    </div>
    <label className="mt-5 block text-sm font-black text-slate-700 dark:text-slate-200">Konu<input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className={fieldClass} /></label>
    <label className="mt-5 block text-sm font-black text-slate-700 dark:text-slate-200">Mesaj<textarea required minLength={10} rows={7} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={`${fieldClass} resize-y`} /></label>
    <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
    {state === "sent" && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Mesajiniz iletildi. En kisa surede donecegiz.</p>}
    {state === "error" && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
    <button disabled={state === "sending"} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">{state === "sending" ? "Gonderiliyor..." : "Mesaji Gonder"}</button>
  </form>;
}
