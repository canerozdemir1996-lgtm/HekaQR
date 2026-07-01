"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Lock, Send, XCircle } from "lucide-react";
import type { ExamAnswerMap, ExamPublicConfig } from "@/lib/exam";

type Result = {
  id: string;
  submitted_at?: string;
  time_used_seconds?: number;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  passed: boolean;
};

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function shuffle<T>(items: T[], enabled: boolean) {
  if (!enabled) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ExamPageClient({
  slug,
  title,
  config,
  availability,
  submissionId,
}: {
  slug: string;
  title: string;
  config: ExamPublicConfig;
  availability: { open: boolean; reason: "not_started" | "closed" | null };
  submissionId?: string;
}) {
  const startedAtRef = useRef(new Date().toISOString());
  const [participant, setParticipant] = useState({ name: "", email: "", studentNo: "" });
  const [accessCode, setAccessCode] = useState("");
  const [answers, setAnswers] = useState<ExamAnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState(config.timeLimitMinutes > 0 ? config.timeLimitMinutes * 60 : 0);
  const autoSubmittedRef = useRef(false);

  const questions = useMemo(() => shuffle(config.questions, config.shuffleQuestions), [config.questions, config.shuffleQuestions]);

  useEffect(() => {
    if (!submissionId) return;
    fetch(`/api/v1/exams/submissions/${encodeURIComponent(submissionId)}?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.submission) setResult(data.submission);
      })
      .catch(() => undefined);
  }, [slug, submissionId]);

  const submit = useCallback(async (auto = false) => {
    if (submitting || result) return;
    setSubmitting(true);
    setError("");
    const elapsedSeconds = Math.round((Date.now() - +new Date(startedAtRef.current)) / 1000);
    const response = await fetch("/api/v1/exams/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, participant, accessCode, answers, startedAt: startedAtRef.current, elapsedSeconds }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSubmitting(false);
    if (!response?.ok) {
      setError(data?.error || (auto ? "Süre doldu, gönderim tamamlanamadı." : "Sınav gönderilemedi."));
      return;
    }
    setResult(data.submission);
    if (data?.submission?.id) {
      const url = new URL(window.location.href);
      url.searchParams.set("submission", data.submission.id);
      window.history.replaceState(null, "", url.toString());
    }
  }, [accessCode, answers, participant, result, slug, submitting]);

  useEffect(() => {
    if (!config.timeLimitMinutes || result || !availability.open) return;
    const timer = window.setInterval(() => {
      const elapsed = Math.round((Date.now() - +new Date(startedAtRef.current)) / 1000);
      const next = config.timeLimitMinutes * 60 - elapsed;
      setRemaining(next);
      if (next <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void submit(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [availability.open, config.timeLimitMinutes, result, submit]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (!availability.open) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <Clock className="mx-auto mb-3" />
          <h1 className="text-xl font-black">{availability.reason === "not_started" ? "Sınav henüz başlamadı" : "Sınav kapandı"}</h1>
          <p className="mt-2 text-sm text-slate-300">{title}</p>
        </div>
      </main>
    );
  }

  if (result) {
    const percent = result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0;
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] p-6">
          {result.passed ? <CheckCircle2 className="mb-4 text-emerald-400" size={44} /> : <XCircle className="mb-4 text-rose-400" size={44} />}
          <h1 className="text-2xl font-black">{result.passed ? "Başarılı" : "Tamamlandı"}</h1>
          <p className="mt-2 text-slate-300">{config.title}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-400">Puan</p><p className="text-2xl font-black">{percent}%</p></div>
            <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-400">Skor</p><p className="text-2xl font-black">{result.score}/{result.max_score}</p></div>
            <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-400">Doğru</p><p className="text-2xl font-black">{result.correct_count}</p></div>
            <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-400">Yanlış/Boş</p><p className="text-2xl font-black">{result.wrong_count + result.blank_count}</p></div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <section className="mx-auto max-w-2xl">
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">{config.title || title}</h1>
              {config.description && <p className="mt-1 text-sm text-slate-300">{config.description}</p>}
            </div>
            {config.timeLimitMinutes > 0 && <div className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black">{formatSeconds(remaining)}</div>}
          </div>
        </div>

        <div className="space-y-4">
          {config.instructions && <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-200">{config.instructions}</p>}

          {(config.access.mode === "password" || config.access.mode === "code" || config.access.mode === "one_time") && (
            <label className="block rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold"><Lock size={16} /> Erişim kodu</span>
              <input value={accessCode} onChange={e => setAccessCode(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-400" />
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {config.participantFields.name && <input value={participant.name} onChange={e => setParticipant(p => ({ ...p, name: e.target.value }))} placeholder="Ad soyad" className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 outline-none focus:border-emerald-400" />}
            {config.participantFields.email && <input type="email" value={participant.email} onChange={e => setParticipant(p => ({ ...p, email: e.target.value }))} placeholder="E-posta" className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 outline-none focus:border-emerald-400" />}
            {config.participantFields.studentNo && <input value={participant.studentNo} onChange={e => setParticipant(p => ({ ...p, studentNo: e.target.value }))} placeholder="Öğrenci no" className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 outline-none focus:border-emerald-400" />}
          </div>

          {questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <legend className="mb-3 text-sm font-black text-slate-300">Soru {index + 1}</legend>
              <p className="text-base font-bold">{question.prompt}</p>
              {question.helpText && <p className="mt-1 text-sm text-slate-400">{question.helpText}</p>}
              <div className="mt-4 space-y-2">
                {question.type === "short_answer" ? (
                  <textarea value={String(answers[question.id] ?? "")} onChange={e => setAnswer(question.id, e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 outline-none focus:border-emerald-400" />
                ) : shuffle(question.options, config.shuffleOptions).map(option => (
                  <label key={option.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900 px-3 py-3">
                    <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswer(question.id, option.id)} />
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
          <button onClick={() => submit(false)} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
            <Send size={18} /> {submitting ? "Gönderiliyor" : "Sınavı Gönder"}
          </button>
        </div>
      </section>
    </main>
  );
}
