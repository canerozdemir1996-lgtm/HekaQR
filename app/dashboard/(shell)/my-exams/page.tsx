"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileQuestion, Mail, XCircle } from "lucide-react";

type MyExamAnswer = {
  id: string;
  question_id: string;
  prompt: string;
  answer: string | string[] | null;
  correct_answer: string | string[] | null;
  is_correct: boolean;
  points: number;
  max_points: number;
  type: string;
};

type MyExamSubmission = {
  id: string;
  qr_title: string;
  qr_slug: string;
  submitted_at: string | null;
  started_at: string | null;
  time_used_seconds: number | null;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  passed: boolean;
  status: string;
  answers: MyExamAnswer[];
};

function answerText(value: MyExamAnswer["answer"] | MyExamAnswer["correct_answer"]) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value ?? "").trim() || "-";
}

function dateLabel(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function timeLabel(seconds?: number | null) {
  const safe = Math.max(0, Number(seconds ?? 0));
  const min = Math.floor(safe / 60);
  const sec = Math.round(safe % 60);
  return `${min} dk ${sec} sn`;
}

function percent(row: MyExamSubmission) {
  return Number(row.max_score) > 0 ? Math.round((Number(row.score) / Number(row.max_score)) * 100) : 0;
}

export default function MyExamsPage() {
  const [rows, setRows] = useState<MyExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");
  const [mailing, setMailing] = useState("");
  const [mailMessage, setMailMessage] = useState("");

  useEffect(() => {
    fetch("/api/v1/exams/my", { cache: "no-store" })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setRows(data.submissions ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const openRow = useMemo(() => rows.find(row => row.id === openId) ?? null, [openId, rows]);

  async function sendMail(id: string) {
    setMailing(id);
    setMailMessage("");
    try {
      const response = await fetch("/api/v1/exams/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Mail gönderilemedi.");
      setMailMessage(data.sent ? "Sonuç e-posta adresinize gönderildi." : "Mail servisi yapılandırılmamış; sonuç panelde görüntülenebilir.");
    } catch (error) {
      setMailMessage(error instanceof Error ? error.message : "Mail gönderilemedi.");
    } finally {
      setMailing("");
    }
  }

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Sınav Geçmişi</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Kendi Sınavlarım</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-400">
            Girdiğiniz sınavları, puanlarınızı, sürelerinizi ve cevap detaylarınızı buradan takip edin.
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
          {rows.length} kayıt
        </div>
      </header>

      {mailMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          {mailMessage}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          {loading ? (
            <div className="p-8 text-sm font-bold text-slate-500">Sınav geçmişi yükleniyor...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <FileQuestion className="mx-auto mb-3 text-violet-500" />
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Henüz sınav kaydı yok</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Sınava girerken kullandığınız e-posta ile oturum e-postanız aynıysa kayıtlar burada görünür.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {rows.map(row => {
                const active = openId === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setOpenId(active ? "" : row.id)}
                    className={`grid w-full gap-3 p-4 text-left transition hover:bg-violet-50/60 dark:hover:bg-white/5 sm:grid-cols-[1fr_auto] ${active ? "bg-violet-50 dark:bg-violet-500/10" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-black text-slate-950 dark:text-white">{row.qr_title}</h2>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${row.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"}`}>
                          {row.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {row.passed ? "Başarılı" : "Başarısız"}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500">/{row.qr_slug}</p>
                      <p className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span>{dateLabel(row.submitted_at)}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {timeLabel(row.time_used_seconds)}</span>
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-black text-slate-950 dark:text-white">{percent(row)}%</p>
                      <p className="text-xs font-bold text-slate-500">{row.score}/{row.max_score} puan</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          {!openRow ? (
            <div className="flex min-h-[260px] items-center justify-center text-center">
              <div>
                <FileQuestion className="mx-auto mb-3 text-violet-500" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Detayları görmek için bir sınav seçin.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">{openRow.qr_title}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">{dateLabel(openRow.submitted_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void sendMail(openRow.id)}
                  disabled={mailing === openRow.id}
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:opacity-60"
                >
                  <Mail size={14} /> {mailing === openRow.id ? "Gönderiliyor" : "Mail Gönder"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doğru</p>
                  <p className="mt-1 text-xl font-black text-emerald-600">{openRow.correct_count}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yanlış</p>
                  <p className="mt-1 text-xl font-black text-rose-600">{openRow.wrong_count}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Boş</p>
                  <p className="mt-1 text-xl font-black text-slate-600 dark:text-slate-200">{openRow.blank_count}</p>
                </div>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {openRow.answers.map((answer, index) => (
                  <article key={answer.id ?? answer.question_id} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                    <div className="flex items-start gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-slate-950 dark:text-white">{answer.prompt}</h3>
                        <dl className="mt-3 space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <div><dt className="font-black text-slate-400">Verilen cevap</dt><dd>{answerText(answer.answer)}</dd></div>
                          <div><dt className="font-black text-slate-400">Doğru cevap</dt><dd>{answerText(answer.correct_answer)}</dd></div>
                          <div className={answer.is_correct ? "text-emerald-600" : "text-rose-600"}>
                            {answer.is_correct ? "Doğru" : "Yanlış"} · {answer.points}/{answer.max_points} puan
                          </div>
                        </dl>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
