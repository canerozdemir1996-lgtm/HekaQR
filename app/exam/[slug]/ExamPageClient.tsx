"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlarmClock,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Save,
  Flag,
  Lock,
  QrCode,
  Send,
  XCircle,
} from "lucide-react";
import type { ExamAnswerMap, ExamPublicConfig } from "@/lib/exam";
import HorizontalScroller from "@/components/HorizontalScroller";

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
  status?: string;
};

type Stage = "intro" | "exam" | "review" | "done";

const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
const ringCircumference = 2 * Math.PI * 15;

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

function stageStorageKey(slug: string) {
  return `qrpublish_exam_${slug}_v3`;
}

function requiredAccess(mode: ExamPublicConfig["access"]["mode"]) {
  return mode === "password" || mode === "code" || mode === "one_time";
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
  const storageKey = useMemo(() => stageStorageKey(slug), [slug]);
  const initialSeconds = config.timeLimitMinutes > 0 ? config.timeLimitMinutes * 60 : 0;
  const startedAtRef = useRef(new Date().toISOString());
  const autoSubmittedRef = useRef(false);
  const [stage, setStage] = useState<Stage>("intro");
  const [participant, setParticipant] = useState({ name: "", email: "", studentNo: "" });
  const [accessCode, setAccessCode] = useState("");
  const [answers, setAnswers] = useState<ExamAnswerMap>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [triedStart, setTriedStart] = useState(false);
  const [startError, setStartError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [timeUp, setTimeUp] = useState(false);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [deadlineAt, setDeadlineAt] = useState("");
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(initialSeconds);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const questions = useMemo(() => shuffle(config.questions, config.shuffleQuestions), [config.questions, config.shuffleQuestions]);
  const total = questions.length;
  const currentQuestion = questions[Math.min(current, Math.max(0, total - 1))];
  const totalSeconds = Math.max(1, totalDurationSeconds || initialSeconds || total * 60);
  const answeredCount = questions.filter((question) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(String(answer ?? "").trim());
  }).length;
  const unansweredCount = Math.max(0, total - answeredCount);
  const flagCount = Object.values(flags).filter(Boolean).length;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        stage?: Stage;
        participant?: { name?: string; email?: string; studentNo?: string };
        accessCode?: string;
        answers?: ExamAnswerMap;
        flags?: Record<string, boolean>;
        current?: number;
        startedAt?: string;
        attemptId?: string;
        deadlineAt?: string;
        totalDurationSeconds?: number;
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the saved browser-only attempt after mount.
      if (parsed.stage && parsed.stage !== "done") setStage(parsed.stage);
      if (parsed.participant) setParticipant({
        name: parsed.participant.name ?? "",
        email: parsed.participant.email ?? "",
        studentNo: parsed.participant.studentNo ?? "",
      });
      if (parsed.accessCode) setAccessCode(parsed.accessCode);
      if (parsed.answers) setAnswers(parsed.answers);
      if (parsed.flags) setFlags(parsed.flags);
      if (typeof parsed.current === "number") setCurrent(Math.max(0, Math.min(parsed.current, Math.max(0, total - 1))));
      if (parsed.startedAt) startedAtRef.current = parsed.startedAt;
      if (parsed.attemptId) setAttemptId(parsed.attemptId);
      if (parsed.deadlineAt) setDeadlineAt(parsed.deadlineAt);
      if (typeof parsed.totalDurationSeconds === "number") setTotalDurationSeconds(Math.max(0, parsed.totalDurationSeconds));
    } catch {
      // Ignore corrupted local progress.
    }
  }, [storageKey, total]);

  useEffect(() => {
    if (stage === "done") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        stage,
        participant,
        accessCode,
        answers,
        flags,
        current,
        startedAt: startedAtRef.current,
        attemptId,
        deadlineAt,
        totalDurationSeconds,
      }));
    } catch {
      // Ignore storage quota/private mode.
    }
  }, [accessCode, answers, attemptId, current, deadlineAt, flags, participant, stage, storageKey, totalDurationSeconds]);

  useEffect(() => {
    if (!submissionId) return;
    fetch(`/api/v1/exams/submissions/${encodeURIComponent(submissionId)}?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.submission) {
          setResult(data.submission);
          setStage("done");
        }
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
      body: JSON.stringify({ slug, participant, accessCode, answers, attemptId, startedAt: startedAtRef.current, elapsedSeconds }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSubmitting(false);
    if (!response?.ok) {
      setError(data?.error || (auto ? "Süre doldu, gönderim tamamlanamadı." : "Sınav gönderilemedi."));
      if (auto) setStage("review");
      return;
    }
    setTimeUp(auto);
    setResult(data.submission);
    setStage("done");
    try { window.localStorage.removeItem(storageKey); } catch {}
    if (data?.submission?.id) {
      const url = new URL(window.location.href);
      url.searchParams.set("submission", data.submission.id);
      window.history.replaceState(null, "", url.toString());
    }
  }, [accessCode, answers, attemptId, participant, result, slug, storageKey, submitting]);

  useEffect(() => {
    if (!attemptId || result || (stage !== "exam" && stage !== "review")) return;
    let cancelled = false;
    const syncDeadline = async () => {
      const response = await fetch(`/api/v1/exams/submissions/${encodeURIComponent(attemptId)}?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => ({}));
      if (cancelled || !response?.ok || !data?.attempt) return;
      const serverNow = Date.parse(data.attempt.server_now ?? "");
      if (Number.isFinite(serverNow)) setServerOffsetMs(serverNow - Date.now());
      setDeadlineAt(String(data.attempt.deadline_at ?? ""));
      setTotalDurationSeconds(Math.max(0, Number(data.attempt.total_duration_seconds) || 0));
    };
    void syncDeadline();
    const timer = window.setInterval(() => void syncDeadline(), 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [attemptId, result, slug, stage]);

  useEffect(() => {
    if (!config.timeLimitMinutes || result || !availability.open || (stage !== "exam" && stage !== "review")) return;
    const timer = window.setInterval(() => {
      const next = deadlineAt
        ? Math.ceil((Date.parse(deadlineAt) - (Date.now() + serverOffsetMs)) / 1000)
        : config.timeLimitMinutes * 60 - Math.round((Date.now() - +new Date(startedAtRef.current)) / 1000);
      setRemaining(Math.max(0, next));
      if (next <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void submit(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [availability.open, config.timeLimitMinutes, deadlineAt, result, serverOffsetMs, stage, submit]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (stage !== "exam") return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrent((value) => {
          if (value >= total - 1) {
            setStage("review");
            return value;
          }
          return value + 1;
        });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrent((value) => Math.max(0, value - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, total]);

  function validateStart() {
    if (requiredAccess(config.access.mode) && !accessCode.trim()) return "Lütfen erişim kodunu girin.";
    if (config.participantFields.name && !participant.name.trim()) return "Lütfen ad soyad bilgisini girin.";
    if (config.participantFields.email && !participant.email.trim()) return "Lütfen e-posta adresinizi girin.";
    if (config.participantFields.studentNo && !participant.studentNo.trim()) return "Lütfen öğrenci numaranızı girin.";
    return "";
  }

  async function startExam() {
    setTriedStart(true);
    const message = validateStart();
    setStartError(message);
    if (message) return;
    startedAtRef.current = new Date().toISOString();
    setStartError("");
    const response = await fetch("/api/v1/exams/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, participant, accessCode, startedAt: startedAtRef.current }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      setStartError(data?.error || "Sınav başlatılamadı.");
      return;
    }
    setAttemptId(data.attempt?.id ?? "");
    setDeadlineAt(data.attempt?.deadline_at ?? "");
    setTotalDurationSeconds(Math.max(0, Number(data.attempt?.total_duration_seconds) || initialSeconds));
    const serverNow = Date.parse(data.attempt?.server_now ?? "");
    if (Number.isFinite(serverNow)) setServerOffsetMs(serverNow - Date.now());
    setRemaining(Math.max(0, Number(data.attempt?.total_duration_seconds) || initialSeconds));
    setStage("exam");
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiAnswer(questionId: string, value: string) {
    setAnswers(prev => {
      const current = new Set(Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [questionId]: Array.from(current) };
    });
  }

  function toggleFlag(questionId: string) {
    setFlags(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  function goToQuestion(index: number) {
    setCurrent(index);
    setStage("exam");
  }

  const timerTone =
    remaining <= 60
      ? { color: "#DC2626", bg: "#FCE9E9", border: "#F5C9C9" }
      : remaining <= 300
        ? { color: "#B7791F", bg: "#FEF6E7", border: "#F5E4BF" }
        : { color: "#6D28D9", bg: "#F1ECFD", border: "#E4DBF8" };
  const ringOffset = ringCircumference * (1 - Math.max(0, remaining) / totalSeconds);

  if (!availability.open) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#EBE9F4] p-5 text-[#15121C]">
        <div className="max-w-sm rounded-[22px] border border-white bg-white/80 p-6 text-center shadow-2xl shadow-violet-200/40">
          <Clock className="mx-auto mb-3 text-violet-600" />
          <h1 className="text-xl font-black">{availability.reason === "not_started" ? "Sınav henüz başlamadı" : "Sınav kapandı"}</h1>
          <p className="mt-2 text-sm text-[#6B6878]">{title}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#ECE7F7_0%,#EBE9F4_24%,#E8F3EE_100%)] text-[#15121C]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#F6F6FB] shadow-[0_0_70px_-22px_rgba(40,30,80,.22)]">
        {stage === "intro" && (
          <section className="px-6 py-7">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-xl bg-violet-600 text-white">
                <QrCode size={16} />
              </div>
              <span className="text-sm font-extrabold">QR Publish</span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#E4DBF8] bg-[#F1ECFD] px-3 py-1.5 text-[11.5px] font-bold text-violet-600">
                <QrCode size={13} /> QR Sınav
              </span>
            </div>

            <div className="relative mt-8 overflow-hidden rounded-[24px] bg-[linear-gradient(150deg,#1E1B4B,#312E81_60%,#4338CA)] px-6 py-8 text-white">
              <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.4),transparent_70%)]" />
              <div className="relative">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-200">Mobil Sınav</p>
                <h1 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight">{config.title || title}</h1>
                <p className="mt-3 text-sm leading-6 text-[#C7C6E8]">
                  {config.description || "QR ile açılan mobil sınav. Bilgilerinizi girip başlayın; her soru otomatik kaydedilir."}
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  <IntroStat value={total} label="Soru" />
                  <IntroStat value={config.timeLimitMinutes || "∞"} label="Dakika" mono />
                  <IntroStat value="✓" label="Oto-kayıt" />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {requiredAccess(config.access.mode) && (
                <Field label="Erişim kodu" icon={<Lock size={15} className="text-violet-600" />} htmlFor="exam-access-code">
                  <input
                    id="exam-access-code"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    placeholder="Örn. 4821"
                    aria-invalid={triedStart && !accessCode.trim()}
                    className={`h-14 w-full rounded-[15px] border-[1.5px] bg-white px-[18px] text-xl font-bold tracking-[0.14em] text-[#15121C] outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${triedStart && !accessCode.trim() ? "border-red-500" : "border-[#E4E4EE]"}`}
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                {config.participantFields.name && (
                  <Field label="Ad soyad" htmlFor="exam-name">
                    <input
                      id="exam-name"
                      value={participant.name}
                      onChange={(event) => setParticipant(prev => ({ ...prev, name: event.target.value }))}
                      placeholder="Ad soyad"
                      aria-invalid={triedStart && !participant.name.trim()}
                      className={`h-[52px] w-full rounded-[14px] border-[1.5px] bg-white px-4 text-[14.5px] outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${triedStart && !participant.name.trim() ? "border-red-500" : "border-[#E4E4EE]"}`}
                    />
                  </Field>
                )}
                {config.participantFields.studentNo && (
                  <Field label="Öğrenci no" htmlFor="exam-student-no">
                    <input
                      id="exam-student-no"
                      value={participant.studentNo}
                      onChange={(event) => setParticipant(prev => ({ ...prev, studentNo: event.target.value }))}
                      placeholder="Öğrenci no"
                      aria-invalid={triedStart && !participant.studentNo.trim()}
                      className={`h-[52px] w-full rounded-[14px] border-[1.5px] bg-white px-4 text-[14.5px] outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${triedStart && !participant.studentNo.trim() ? "border-red-500" : "border-[#E4E4EE]"}`}
                    />
                  </Field>
                )}
              </div>
              {config.participantFields.email && (
                <Field label="E-posta" htmlFor="exam-email">
                  <input
                    id="exam-email"
                    type="email"
                    value={participant.email}
                    onChange={(event) => setParticipant(prev => ({ ...prev, email: event.target.value }))}
                    placeholder="ornek@sirket.com"
                    aria-invalid={triedStart && !participant.email.trim()}
                    className={`h-[52px] w-full rounded-[14px] border-[1.5px] bg-white px-4 text-[14.5px] outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${triedStart && !participant.email.trim() ? "border-red-500" : "border-[#E4E4EE]"}`}
                  />
                </Field>
              )}
            </div>

            {startError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-[13px] border border-[#F5C9C9] bg-[#FCE9E9] px-4 py-3 text-sm font-semibold text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                {startError}
              </div>
            )}

            <button
              type="button"
              onClick={startExam}
              className="mt-6 flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl border-0 bg-[linear-gradient(135deg,#8B5CF6,#6D28D9)] text-base font-extrabold text-white shadow-[0_16px_32px_-14px_rgba(109,40,217,.65)] transition hover:brightness-105 active:translate-y-px"
            >
              Sınava Başla <ArrowRight size={19} />
            </button>
            <p className="mt-3.5 text-center text-xs text-[#9A97A8]">Başladığınızda süre işlemeye başlar.</p>
          </section>
        )}

        {stage === "exam" && currentQuestion && (
          <section>
            <ExamHeader
              current={current}
              total={total}
              title={config.title || title}
              questions={questions}
              answers={answers}
              flags={flags}
              timerTone={timerTone}
              remaining={remaining}
              ringOffset={ringOffset}
              onGoto={goToQuestion}
            />
            <div className="px-5 pb-[150px] pt-5">
              <div className="rounded-[20px] border border-[#ECECF3] bg-white p-[22px] shadow-[0_14px_36px_-26px_rgba(40,30,80,.4)]">
                <div className="mb-3.5 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-[#F1ECFD] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-violet-600">
                    {currentQuestion.type === "true_false" ? "Doğru / Yanlış" : currentQuestion.type === "short_answer" ? "Kısa cevap" : currentQuestion.type === "fill_blank" ? "Boşluk doldurma" : currentQuestion.type === "essay" ? "Klasik" : currentQuestion.type === "multi_select" ? "Çoklu seçim" : "Çoktan seçmeli"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-bold ${flags[currentQuestion.id] ? "border-[#F0D9A8] bg-[#FEF6E7] text-[#B7791F]" : "border-[#EAEAF1] bg-[#FAFAFD] text-[#6B6878]"}`}
                  >
                    <Flag size={14} /> {flags[currentQuestion.id] ? "İşaretlendi" : "Sonra incele"}
                  </button>
                </div>
                <p className="mb-5 text-lg font-bold leading-[1.45] text-[#1B1826]">{currentQuestion.prompt}</p>
                {currentQuestion.type === "fill_blank" ? (
                  <input
                    value={String(answers[currentQuestion.id] ?? "")}
                    onChange={(event) => setAnswer(currentQuestion.id, event.target.value)}
                    placeholder="Boşluğu doldurun"
                    className="h-14 w-full rounded-2xl border-2 border-[#EAEAF1] bg-[#FAFAFD] px-4 text-[16px] font-semibold outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
                  />
                ) : currentQuestion.type === "short_answer" || currentQuestion.type === "essay" ? (
                  <textarea
                    value={String(answers[currentQuestion.id] ?? "")}
                    onChange={(event) => setAnswer(currentQuestion.id, event.target.value)}
                    rows={currentQuestion.type === "essay" ? 8 : 5}
                    className="w-full rounded-2xl border-2 border-[#EAEAF1] bg-[#FAFAFD] px-4 py-3 text-[15.5px] font-semibold outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {shuffle(currentQuestion.options, config.shuffleOptions).map((option, index) => {
                      const selected = currentQuestion.type === "multi_select"
                        ? Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as string[]).includes(option.id)
                        : answers[currentQuestion.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => currentQuestion.type === "multi_select" ? toggleMultiAnswer(currentQuestion.id, option.id) : setAnswer(currentQuestion.id, option.id)}
                          className={`flex w-full items-center gap-3.5 rounded-2xl border-2 px-[18px] py-4 text-left transition ${selected ? "border-violet-500 bg-[#F3EEFE] shadow-[0_0_0_3px_rgba(139,92,246,.12)]" : "border-[#EAEAF1] bg-[#FAFAFD]"}`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[15px] font-extrabold ${selected ? "bg-[linear-gradient(135deg,#8B5CF6,#6D28D9)] text-white" : "bg-[#EFEFF4] text-[#8A8796]"}`}>
                            {letters[index] ?? index + 1}
                          </span>
                          <span className={`flex-1 text-[15.5px] ${selected ? "font-bold text-[#2E1065]" : "font-semibold text-[#2A2738]"}`}>{option.text}</span>
                          {selected && <CheckCircle2 size={22} className="text-violet-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#9A97A8]">
                <Save size={15} className="text-emerald-500" /> Yanıtlar otomatik kaydediliyor
              </div>
            </div>
            <div className="sticky bottom-0 z-40 bg-[linear-gradient(180deg,rgba(246,246,251,0),rgba(246,246,251,.96)_30%)] px-5 pb-5 pt-3.5">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrent(value => Math.max(0, value - 1))}
                  disabled={current === 0}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[15px] border border-[#E4E4EE] bg-white text-[#4B4858] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Önceki soru"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => current >= total - 1 ? setStage("review") : setCurrent(value => value + 1)}
                  className={`flex h-14 flex-1 items-center justify-center gap-2.5 rounded-[15px] border-0 text-[15.5px] font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(109,40,217,.6)] transition hover:brightness-105 active:translate-y-px ${current >= total - 1 ? "bg-[linear-gradient(135deg,#10B981,#059669)]" : "bg-[linear-gradient(135deg,#8B5CF6,#6D28D9)]"}`}
                >
                  {current >= total - 1 ? <ClipboardCheck size={19} /> : <ArrowRight size={19} />}
                  {current >= total - 1 ? "İncele ve Gönder" : "Sonraki"}
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === "review" && (
          <ReviewStage
            configTitle={config.title || title}
            timerTone={timerTone}
            remaining={remaining}
            questions={questions}
            answers={answers}
            flags={flags}
            answeredCount={answeredCount}
            unansweredCount={unansweredCount}
            flagCount={flagCount}
            submitting={submitting}
            error={error}
            onGoto={goToQuestion}
            onSubmit={() => void submit(false)}
            onBack={() => setStage("exam")}
          />
        )}

        {stage === "done" && (
          <DoneStage
            result={result}
            timeUp={timeUp}
            participant={participant}
            answeredCount={answeredCount}
            total={total}
            remaining={remaining}
            title={config.title || title}
          />
        )}
      </div>
    </main>
  );
}

function IntroStat({ value, label, mono = false }: { value: string | number; label: string; mono?: boolean }) {
  return (
    <div className="rounded-[14px] border border-white/15 bg-white/10 p-3">
      <div className={`text-[22px] font-extrabold ${mono ? "font-mono" : ""}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-[#B9B7DA]">{label}</div>
    </div>
  );
}

function Field({ label, icon, htmlFor, children }: { label: string; icon?: ReactNode; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-[#3C4150]">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ExamHeader({
  current,
  total,
  title,
  questions,
  answers,
  flags,
  timerTone,
  remaining,
  ringOffset,
  onGoto,
}: {
  current: number;
  total: number;
  title: string;
  questions: ExamPublicConfig["questions"];
  answers: ExamAnswerMap;
  flags: Record<string, boolean>;
  timerTone: { color: string; bg: string; border: string };
  remaining: number;
  ringOffset: number;
  onGoto: (index: number) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EAEAF1] bg-[#F6F6FB]/90 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 pb-3 pt-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold">
            Soru {current + 1} <span className="font-bold text-[#B4B1C2]">/ {total}</span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-[#8A8796]">{title}</div>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-[13px] border px-2 pl-2" style={{ background: timerTone.bg, borderColor: timerTone.border }}>
          <svg width="30" height="30" viewBox="0 0 36 36" className="-rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke={timerTone.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} />
          </svg>
          <span className="font-mono text-[14.5px] font-bold" style={{ color: timerTone.color }}>{formatSeconds(remaining)}</span>
        </div>
      </div>
      <HorizontalScroller
        ariaLabel="Sınav soruları"
        showArrows={false}
        scrollPadding="lg"
        contentClassName="gap-2 py-1"
        viewportClassName="pb-3.5"
      >
        {questions.map((question, index) => {
          const rawAnswer = answers[question.id];
          const answered = Array.isArray(rawAnswer) ? rawAnswer.length > 0 : Boolean(String(rawAnswer ?? "").trim());
          const flagged = flags[question.id];
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onGoto(index)}
              className={`relative h-[38px] w-[38px] shrink-0 rounded-[11px] text-sm font-extrabold ${answered ? "border border-transparent bg-[linear-gradient(135deg,#8B5CF6,#6D28D9)] text-white" : flagged ? "border border-[#F0D9A8] bg-[#FEF6E7] text-[#B7791F]" : "border border-[#E4E4EE] bg-[#F1F1F6] text-[#6B6878]"} ${index === current ? "ring-[3px] ring-violet-500/35" : ""}`}
              aria-label={`${index + 1}. soruya git`}
            >
              {index + 1}
              {flagged && <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full bg-amber-500" />}
            </button>
          );
        })}
      </HorizontalScroller>
    </header>
  );
}

function ReviewStage({
  configTitle,
  timerTone,
  remaining,
  questions,
  answers,
  flags,
  answeredCount,
  unansweredCount,
  flagCount,
  submitting,
  error,
  onGoto,
  onSubmit,
  onBack,
}: {
  configTitle: string;
  timerTone: { color: string; bg: string; border: string };
  remaining: number;
  questions: ExamPublicConfig["questions"];
  answers: ExamAnswerMap;
  flags: Record<string, boolean>;
  answeredCount: number;
  unansweredCount: number;
  flagCount: number;
  submitting: boolean;
  error: string;
  onGoto: (index: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <section className="px-[22px] pb-[150px] pt-7">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-600">Gözden Geçir</p>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight">Göndermeden önce kontrol edin</h1>
        </div>
        <div className="flex h-[38px] items-center gap-2 rounded-xl border px-3" style={{ background: timerTone.bg, borderColor: timerTone.border }}>
          <Clock size={15} style={{ color: timerTone.color }} />
          <span className="font-mono text-sm font-bold" style={{ color: timerTone.color }}>{formatSeconds(remaining)}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <ReviewStat value={answeredCount} label="Yanıtlandı" color="#10B981" />
        <ReviewStat value={unansweredCount} label="Boş" color={unansweredCount > 0 ? "#B7791F" : "#9A97A8"} />
        <ReviewStat value={flagCount} label="İşaretli" color="#B7791F" />
      </div>

      <div className="mt-5 rounded-[18px] border border-[#ECECF3] bg-white p-5">
        <div className="mb-3.5 text-sm font-extrabold">Tüm sorular</div>
        <div className="grid grid-cols-5 gap-2.5">
          {questions.map((question, index) => {
            const rawAnswer = answers[question.id];
            const answered = Array.isArray(rawAnswer) ? rawAnswer.length > 0 : Boolean(String(rawAnswer ?? "").trim());
            const flagged = flags[question.id];
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onGoto(index)}
                className={`relative aspect-square rounded-xl text-[15px] font-extrabold ${answered ? "border border-transparent bg-[linear-gradient(135deg,#8B5CF6,#6D28D9)] text-white" : flagged ? "border border-[#F0D9A8] bg-[#FEF6E7] text-[#B7791F]" : "border border-[#E0E0EA] bg-[#F1F1F6] text-[#6B6878]"}`}
              >
                {index + 1}
                {flagged && <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full bg-amber-500" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3.5 border-t border-[#F0F0F4] pt-3.5 text-[11.5px] text-[#6B6878]">
          <Legend color="linear-gradient(135deg,#8B5CF6,#6D28D9)" label="Yanıtlandı" />
          <Legend color="#F1F1F6" label="Boş" border />
          <Legend color="#FEF6E7" label="İşaretli" border />
        </div>
      </div>

      {unansweredCount > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[#F5E4BF] bg-[#FEF6E7] px-4 py-3.5 text-[13px] font-semibold leading-5 text-[#946510]">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#B7791F]" />
          {unansweredCount} soru boş kaldı. Boş bırakılan sorular değerlendirmede yanlış sayılabilir.
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3.5 text-[13px] font-semibold leading-5 text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="sticky bottom-0 mt-6 bg-[linear-gradient(180deg,rgba(246,246,251,0),#F6F6FB_30%)] pb-1 pt-3.5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl border-0 bg-[linear-gradient(135deg,#10B981,#059669)] text-base font-extrabold text-white shadow-[0_16px_32px_-14px_rgba(5,150,105,.7)] transition hover:brightness-105 active:translate-y-px disabled:cursor-wait disabled:opacity-70"
        >
          <Send size={19} /> {submitting ? "Gönderiliyor" : "Sınavı Gönder"}
        </button>
        <button type="button" onClick={onBack} className="mt-2.5 flex h-[50px] w-full items-center justify-center gap-2 border-0 bg-transparent text-[14.5px] font-bold text-violet-600">
          <ArrowLeft size={17} /> Sorulara dön
        </button>
      </div>
      <p className="sr-only">{configTitle}</p>
    </section>
  );
}

function ReviewStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#ECECF3] bg-white p-4">
      <div className="text-[26px] font-extrabold tracking-tight" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-[11.5px] font-semibold text-[#6B6878]">{label}</div>
    </div>
  );
}

function Legend({ color, label, border = false }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${border ? "border border-[#E0E0EA]" : ""}`} style={{ background: color }} />
      {label}
    </span>
  );
}

function DoneStage({
  result,
  timeUp,
  participant,
  answeredCount,
  total,
  remaining,
  title,
}: {
  result: Result | null;
  timeUp: boolean;
  participant: { name: string; email: string; studentNo: string };
  answeredCount: number;
  total: number;
  remaining: number;
  title: string;
}) {
  const passed = result?.passed ?? true;
  const needsReview = result?.status === "needs_review";
  const iconBg = timeUp
    ? "linear-gradient(135deg,#F59E0B,#D97706)"
    : needsReview
      ? "linear-gradient(135deg,#8B5CF6,#6D28D9)"
    : passed
      ? "linear-gradient(135deg,#10B981,#059669)"
      : "linear-gradient(135deg,#8B5CF6,#6D28D9)";
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full text-white shadow-[0_20px_44px_-18px_rgba(5,150,105,.6)]" style={{ background: iconBg }}>
        {timeUp ? <AlarmClock size={44} /> : needsReview ? <ClipboardCheck size={44} /> : passed ? <Check size={44} /> : <XCircle size={44} />}
      </div>
      <h1 className="mt-7 text-[27px] font-extrabold tracking-tight">{timeUp ? "Süre doldu" : needsReview ? "Değerlendirme bekliyor" : "Sınavınız gönderildi"}</h1>
      <p className="mt-3 max-w-[340px] text-[15px] leading-6 text-[#56536A]">
        {timeUp ? "Süre dolduğu için yanıtlarınız otomatik gönderildi. Katıldığınız için teşekkürler." : needsReview ? "Klasik cevaplarınız eğitmen tarafından puanlandıktan sonra sonuç kesinleşir." : "Yanıtlarınız başarıyla kaydedildi. Katıldığınız için teşekkürler."}
      </p>
      <div className="mt-7 w-full max-w-[360px] rounded-[18px] border border-[#ECECF3] bg-white px-5 py-2">
        <DoneRow label="Sınav" value={title} />
        <DoneRow label="Ad soyad" value={participant.name.trim() || "—"} />
        <DoneRow label="Öğrenci no" value={participant.studentNo.trim() || participant.email.trim() || "—"} />
        <DoneRow label="Yanıtlanan" value={`${result ? total - result.blank_count : answeredCount} / ${total}`} accent />
        <DoneRow label="Kalan süre" value={formatSeconds(remaining)} mono last />
      </div>
      <div className="mt-7 flex items-center gap-2 text-[12.5px] text-[#9A97A8]">
        <QrCode size={18} className="text-violet-600" /> QR Publish ile oluşturuldu
      </div>
    </section>
  );
}

function DoneRow({ label, value, accent = false, mono = false, last = false }: { label: string; value: string; accent?: boolean; mono?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${last ? "" : "border-b border-[#F0F0F4]"}`}>
      <span className="text-[13.5px] text-[#6B6878]">{label}</span>
      <span className={`truncate text-sm font-bold ${accent ? "text-violet-600" : ""} ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
