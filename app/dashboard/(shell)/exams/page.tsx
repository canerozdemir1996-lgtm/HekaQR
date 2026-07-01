"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileQuestion, Search } from "lucide-react";

type Submission = {
  id: string;
  qr_id: string;
  qr_title: string;
  qr_slug: string;
  participant: { name?: string; email?: string; studentNo?: string };
  submitted_at: string;
  time_used_seconds: number;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  passed: boolean;
};

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

export default function ExamReportsPage() {
  const [payload, setPayload] = useState<Payload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [qrId, setQrId] = useState("");
  const [passed, setPassed] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Sınav Sonuçları</h1>
          <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">QR sınav gönderimleri, başarı oranı ve soru analizi.</p>
        </div>
        <a href={csvHref} className="dashboard-action bg-emerald-600 text-white hover:bg-emerald-500">
          <Download size={16} /> CSV
        </a>
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
        <select value={qrId} onChange={e => setQrId(e.target.value)} className="dashboard-input">
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

      <div className="dashboard-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-[var(--text-secondary)]">Yükleniyor</div>
        ) : payload.submissions.length === 0 ? (
          <div className="p-10 text-center">
            <FileQuestion className="mx-auto mb-3 text-slate-400" />
            <p className="font-black text-slate-900 dark:text-white">Henüz sınav sonucu yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3">Sınav</th>
                  <th className="px-4 py-3">Katılımcı</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Süre</th>
                  <th className="px-4 py-3">Skor</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {payload.submissions.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-bold">{row.qr_title}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{row.participant?.name || "İsimsiz"}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{row.participant?.email || row.participant?.studentNo || ""}</p>
                    </td>
                    <td className="px-4 py-3">{row.submitted_at ? new Date(row.submitted_at).toLocaleString("tr-TR") : "-"}</td>
                    <td className="px-4 py-3">{timeLabel(row.time_used_seconds)}</td>
                    <td className="px-4 py-3 font-black">%{percent(row)} · {row.score}/{row.max_score}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-black ${row.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"}`}>
                        {row.passed ? "Geçti" : "Kaldı"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payload.summary.questionAnalysis.length > 0 && (
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
