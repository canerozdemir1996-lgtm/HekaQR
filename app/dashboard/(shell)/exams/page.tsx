"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Download, FileQuestion, Save, Search, TimerReset, Users } from "lucide-react";

type Submission = {
  id: string;
  qr_id: string;
  qr_title: string;
  qr_slug: string;
  participant: { name?: string; email?: string; studentNo?: string };
  started_at: string;
  submitted_at: string;
  time_used_seconds: number;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  passed: boolean;
  status?: string;
  result_mode?: "score" | "pass_fail";
  extra_time_minutes?: number;
  answers?: Array<{
    question_id: string;
    answer: string | string[] | null;
    is_correct: boolean;
    points: number;
    prompt: string;
    type: string;
    max_points: number;
    correct_answer?: unknown;
  }>;
};

type SubmissionAnswer = NonNullable<Submission["answers"]>[number];

type Payload = {
  submissions: Submission[];
  summary: { total: number; passed: number; failed: number; passRate: number; avgPercent: number; questionAnalysis: Array<{ questionId: string; correct: number; total: number; correctRate: number }> };
  exams: Array<{ id: string; title: string; slug: string; submissions: number }>;
};

const EMPTY_PAYLOAD: Payload = {
  submissions: [],
  summary: { total: 0, passed: 0, failed: 0, passRate: 0, avgPercent: 0, questionAnalysis: [] },
  exams: [],
};

function percent(row: Submission) {
  return Number(row.max_score) > 0 ? Math.round((Number(row.score) / Number(row.max_score)) * 100) : 0;
}

function timeLabel(seconds: number) {
  const min = Math.floor(Number(seconds ?? 0) / 60);
  const sec = Number(seconds ?? 0) % 60;
  return `${min}dk ${sec}sn`;
}

function answerText(answer: SubmissionAnswer["answer"]) {
  if (Array.isArray(answer)) return answer.length ? answer.join(", ") : "-";
  return String(answer ?? "").trim() || "-";
}

function questionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    multiple_choice: "Çoktan seçmeli",
    multi_select: "Çoklu seçim",
    true_false: "Doğru / Yanlış",
    short_answer: "Kısa cevap",
    fill_blank: "Boşluk doldurma",
    essay: "Klasik",
  };
  return labels[type] ?? type;
}

export default function ExamReportsPage() {
  const [payload, setPayload] = useState<Payload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [qrId, setQrId] = useState("");
  const [passed, setPassed] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [grading, setGrading] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [openSubmissionId, setOpenSubmissionId] = useState("");
  const [extraTimeDraft, setExtraTimeDraft] = useState<Record<string, string>>({});
  const [extraTimeReason, setExtraTimeReason] = useState<Record<string, string>>({});
  const [savingExtraTime, setSavingExtraTime] = useState<string | null>(null);
  const [extraTimeError, setExtraTimeError] = useState<Record<string, string>>({});

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (qrId) params.set("qr_id", qrId);
    if (passed) params.set("passed", passed);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params;
  }, [from, passed, qrId, search, to]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/exams/reports?${query}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => setPayload({
        submissions: data.submissions ?? [],
        summary: data.summary ?? EMPTY_PAYLOAD.summary,
        exams: data.exams ?? [],
      }))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [query]);

  const csvHref = `/api/v1/exams/reports?${new URLSearchParams([...Array.from(query.entries()), ["export", "csv"]]).toString()}`;
  const groupedExams = payload.exams.map(exam => ({
    ...exam,
    rows: payload.submissions.filter(row => row.qr_id === exam.id),
  }));
  const selectedExam = groupedExams.find(exam => exam.id === selectedExamId) ?? null;

  async function saveGrades(row: Submission) {
    const rowGrades = grading[row.id] ?? {};
    setSaving(row.id);
    try {
      const response = await fetch(`/api/v1/exams/submissions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grades: (row.answers ?? []).map(answer => ({
            questionId: answer.question_id,
            points: rowGrades[answer.question_id] ?? Number(answer.points ?? 0),
          })),
        }),
      });
      if (!response.ok) throw new Error("Kaydedilemedi");
      const data = await response.json();
      setPayload(prev => ({
        ...prev,
        submissions: prev.submissions.map(item => {
          if (item.id !== row.id) return item;
          const updatedAnswers = item.answers?.map(answer => {
            const next = (data.answers ?? []).find((candidate: any) => candidate.question_id === answer.question_id);
            return next ? { ...answer, points: next.points, is_correct: next.is_correct, correct_answer: next.correct_answer } : answer;
          });
          return { ...item, ...data.submission, answers: updatedAnswers ?? item.answers };
        }),
      }));
      setOpenSubmissionId(row.id);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function saveExtraTime(row: Submission) {
    const minutes = Number(extraTimeDraft[row.id] ?? row.extra_time_minutes ?? 0);
    const reason = String(extraTimeReason[row.id] ?? "").trim();
    setSavingExtraTime(row.id);
    setExtraTimeError(prev => ({ ...prev, [row.id]: "" }));
    try {
      const response = await fetch(`/api/v1/exams/submissions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraTimeMinutes: minutes, extraTimeReason: reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ek süre kaydedilemedi.");
      setPayload(prev => ({
        ...prev,
        submissions: prev.submissions.map(item => item.id === row.id ? { ...item, extra_time_minutes: data.extraTime?.minutes ?? minutes } : item),
      }));
      setExtraTimeReason(prev => ({ ...prev, [row.id]: "" }));
    } catch (error) {
      setExtraTimeError(prev => ({ ...prev, [row.id]: error instanceof Error ? error.message : "Ek süre kaydedilemedi." }));
    } finally {
      setSavingExtraTime(null);
    }
  }

  async function finalizeSelectedExam() {
    if (!selectedExam) return;
    setFinalizing(true);
    try {
      const openRow = selectedExam.rows.find(row => row.id === openSubmissionId);
      if (openRow?.status === "needs_review") {
        const saved = await saveGrades(openRow);
        if (!saved) return;
      }
      const response = await fetch("/api/v1/exams/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrId: selectedExam.id }),
      });
      if (!response.ok) throw new Error("Kesinleştirilemedi");
      setPayload(prev => ({
        ...prev,
        submissions: prev.submissions.map(item => item.qr_id === selectedExam.id
          ? {
            ...item,
            status: "submitted",
            answers: item.answers?.map(answer => ({ ...answer, correct_answer: "__manual_final__" })),
          }
          : item),
      }));
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{selectedExam ? selectedExam.title : "Sınavlar"}</h1>
          <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
            {selectedExam ? `/${selectedExam.slug} sınav detayları, katılımcılar ve cevaplar.` : "Önce bir sınav seçin; detaylar içeride açılır."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedExam && (
            <button
              type="button"
              onClick={() => { setSelectedExamId(""); setQrId(""); setOpenSubmissionId(""); }}
              className="dashboard-action bg-white text-slate-700 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
            >
              <ArrowLeft size={16} /> Sınavlara Dön
            </button>
          )}
          <a href={csvHref} className="dashboard-action bg-emerald-600 text-white hover:bg-emerald-500">
            <Download size={16} /> CSV
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Toplam", payload.summary.total],
          ["Başarılı", payload.summary.passed],
          ["Başarı Oranı", `%${payload.summary.passRate}`],
          ["Ortalama", `%${payload.summary.avgPercent}`],
        ].map(([label, value]) => (
          <div key={label} className="dashboard-card p-4">
            <p className="text-xs font-black uppercase text-[var(--text-secondary)]">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-card grid gap-3 p-4 lg:grid-cols-5">
        <select value={qrId} onChange={e => { setQrId(e.target.value); setSelectedExamId(e.target.value); setOpenSubmissionId(""); }} className="dashboard-input">
          <option value="">Tüm sınavlar</option>
          {payload.exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
        </select>
        <select value={passed} onChange={e => setPassed(e.target.value)} className="dashboard-input">
          <option value="">Tüm sonuçlar</option>
          <option value="true">Geçti</option>
          <option value="false">Kaldı</option>
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="dashboard-input" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="dashboard-input" />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Katılımcı ara" className="dashboard-input pl-9" />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="dashboard-card p-10 text-center text-sm font-bold text-[var(--text-secondary)]">Yükleniyor</div>
        ) : payload.exams.length === 0 ? (
          <div className="dashboard-card p-10 text-center">
            <FileQuestion className="mx-auto mb-3 text-slate-400" />
            <p className="font-black text-slate-900 dark:text-white">Henüz sınav sonucu yok</p>
          </div>
        ) : !selectedExam ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedExams.map(exam => {
              const passedCount = exam.rows.filter(row => row.passed).length;
              const reviewCount = exam.rows.filter(row => row.status === "needs_review").length;
              const avg = exam.rows.length
                ? Math.round(exam.rows.reduce((sum, row) => sum + percent(row), 0) / exam.rows.length)
                : 0;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => { setSelectedExamId(exam.id); setQrId(exam.id); setOpenSubmissionId(""); }}
                  className="dashboard-card group flex min-h-[190px] flex-col justify-between p-5 text-left transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <FileQuestion size={23} />
                    </div>
                    {reviewCount > 0 && (
                      <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                        {reviewCount} bekliyor
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 transition group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300">{exam.title}</h2>
                    <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">/{exam.slug}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[var(--text-secondary)] dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5"><Users size={13} /> {exam.rows.length} katılımcı</span>
                    <span>{passedCount} geçti · %{avg} ort.</span>
                    <ChevronRight size={16} className="text-slate-300 transition group-hover:text-violet-500" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
            <section key={selectedExam.id} className="dashboard-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Katılımcılar</h2>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">/{selectedExam.slug} · {selectedExam.rows.length} gönderim</p>
                </div>
                {selectedExam.rows.some(row => row.status === "needs_review") && (
                  <button
                    type="button"
                    onClick={() => void finalizeSelectedExam()}
                    disabled={finalizing}
                    className="dashboard-action bg-violet-600 text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Save size={16} /> {finalizing ? "Kesinleştiriliyor" : "Değişiklikleri Kaydet ve Sınavı Kesinleştir"}
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {selectedExam.rows.map(row => {
                  const needsReview = row.status === "needs_review";
                  const inProgress = row.status === "in_progress";
                  const open = openSubmissionId === row.id;
                  return (
                    <article key={row.id} className="p-4">
                      <button
                        type="button"
                        onClick={() => setOpenSubmissionId(open ? "" : row.id)}
                        className="grid w-full gap-3 text-left lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center"
                      >
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{row.participant?.name || "İsimsiz"}</p>
                          <p className="text-xs font-semibold text-[var(--text-secondary)]">{row.participant?.email || row.participant?.studentNo || ""}</p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-secondary)]">{row.submitted_at ? new Date(row.submitted_at).toLocaleString("tr-TR") : "-"} · {timeLabel(row.time_used_seconds)}</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{row.result_mode === "pass_fail" ? (row.passed ? "Geçti" : "Kaldı") : `%${percent(row)} · ${row.score}/${row.max_score}`}</p>
                        <span className={`w-fit rounded-full px-2 py-1 text-xs font-black ${inProgress ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200" : needsReview ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200" : row.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"}`}>
                          {inProgress ? "Devam ediyor" : needsReview ? "Değerlendirme bekliyor" : row.passed ? "Geçti" : "Kaldı"}
                        </span>
                      </button>
                      {open ? (
                        <div className={`mt-4 rounded-xl border p-3 ${needsReview ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/10" : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"}`}>
                          {inProgress && (
                            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
                              <div className="flex items-start gap-3">
                                <TimerReset className="mt-0.5 text-blue-600 dark:text-blue-300" size={20} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-blue-950 dark:text-blue-100">Katılımcıya ek süre ver</p>
                                  <p className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-200">Mevcut ek süre: {row.extra_time_minutes ?? 0} dakika. Her değişiklik audit kaydına eklenir.</p>
                                  <div className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr_auto]">
                                    <input
                                      type="number"
                                      min={0}
                                      max={240}
                                      step={1}
                                      aria-label="Toplam ek süre (dakika)"
                                      value={extraTimeDraft[row.id] ?? String(row.extra_time_minutes ?? 0)}
                                      onChange={event => setExtraTimeDraft(prev => ({ ...prev, [row.id]: event.target.value }))}
                                      className="dashboard-input"
                                    />
                                    <input
                                      value={extraTimeReason[row.id] ?? ""}
                                      onChange={event => setExtraTimeReason(prev => ({ ...prev, [row.id]: event.target.value }))}
                                      placeholder="Değişiklik nedeni"
                                      aria-label="Ek süre değişiklik nedeni"
                                      className="dashboard-input"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void saveExtraTime(row)}
                                      disabled={savingExtraTime === row.id}
                                      className="dashboard-action bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                                    >
                                      {savingExtraTime === row.id ? "Kaydediliyor" : "Süreyi Kaydet"}
                                    </button>
                                  </div>
                                  {extraTimeError[row.id] && <p role="alert" className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{extraTimeError[row.id]}</p>}
                                </div>
                              </div>
                            </div>
                          )}
                          {row.answers?.length ? (
                            <>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className={`text-sm font-black ${needsReview ? "text-amber-800 dark:text-amber-100" : "text-slate-900 dark:text-white"}`}>
                              {needsReview ? "Cevaplar ve manuel değerlendirme" : "Kullanıcı cevapları"}
                            </p>
                            {needsReview && (
                              <button onClick={() => void saveGrades(row)} disabled={saving === row.id} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-500 disabled:cursor-wait disabled:opacity-60">
                                <Save size={14} /> {saving === row.id ? "Kaydediliyor" : "Taslak Puanları Kaydet"}
                              </button>
                            )}
                          </div>
                          <div className="grid gap-2">
                            {row.answers.map(answer => (
                              <div key={answer.question_id} className="grid gap-2 rounded-lg bg-white p-3 text-sm dark:bg-slate-950/40 md:grid-cols-[1fr_120px]">
                                <span>
                                  <span className="block font-bold text-slate-900 dark:text-white">{answer.prompt}</span>
                                  <span className="mt-1 block text-xs text-[var(--text-secondary)]">{questionTypeLabel(answer.type)} · Yanıt: {answerText(answer.answer)}</span>
                                </span>
                                {needsReview ? (
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={answer.max_points}
                                      defaultValue={Number(answer.points ?? 0)}
                                      onChange={event => setGrading(prev => ({
                                        ...prev,
                                        [row.id]: { ...(prev[row.id] ?? {}), [answer.question_id]: Math.max(0, Math.min(Number(answer.max_points ?? 0), Number(event.target.value) || 0)) },
                                      }))}
                                      className="dashboard-input h-10"
                                    />
                                    <span className="text-xs font-black text-[var(--text-secondary)]">/ {answer.max_points}</span>
                                  </span>
                                ) : (
                                  <span className={`w-fit rounded-lg px-2 py-1 text-xs font-black ${answer.is_correct ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                                    {answer.points}/{answer.max_points} puan
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                            </>
                          ) : !inProgress ? <p className="text-sm font-semibold text-[var(--text-secondary)]">Bu gönderim için cevap kaydı bulunamadı.</p> : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
        )}
      </div>

      {selectedExam && payload.summary.questionAnalysis.length > 0 && (
        <div className="dashboard-card p-4">
          <h2 className="mb-3 text-sm font-black text-slate-900 dark:text-white">Soru Analizi</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {payload.summary.questionAnalysis.map(item => (
              <div key={item.questionId} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <p className="text-xs font-black text-[var(--text-secondary)]">{item.questionId}</p>
                <p className="mt-1 text-lg font-black">%{item.correctRate}</p>
                <p className="text-xs text-[var(--text-secondary)]">{item.correct}/{item.total} doğru</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
