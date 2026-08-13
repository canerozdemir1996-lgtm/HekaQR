"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileCode2, FlaskConical, Loader2, Play, Search, TestTube2 } from "lucide-react";
import type { AdminTestCatalogEntry } from "@/lib/generated-test-catalog";
import { useTheme } from "@/lib/theme";

type Filter = "all" | "unit" | "e2e";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Tümü",
  unit: "Birim",
  e2e: "Uçtan uca",
};

const TYPE_LABELS: Record<AdminTestCatalogEntry["type"], string> = {
  unit: "Birim testi",
  e2e: "Uçtan uca test",
};

type TestResult = {
  ok: boolean;
  type: AdminTestCatalogEntry["type"];
  file: string | null;
  exitCode: number;
  output: string;
  durationMs: number;
  summary: { passed: number; failed: number; skipped: number; total: number };
  error?: string;
};

function plainResponseMessage(body: string) {
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const text = (title || body)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 500) || "Sunucu boş bir cevap döndürdü.";
}

async function readApiPayload(response: Response, type: AdminTestCatalogEntry["type"], file?: string) {
  const responseBody = await response.text();
  try {
    return JSON.parse(responseBody) as Record<string, unknown>;
  } catch {
    const redirect = response.redirected ? ` Yönlendirilen adres: ${response.url}.` : "";
    return {
      ok: false,
      type,
      file: file ?? null,
      exitCode: response.status || 1,
      output: `Test API'si JSON yerine HTML/metin döndürdü (HTTP ${response.status || "bilinmiyor"}).${redirect}\n${plainResponseMessage(responseBody)}`,
      durationMs: 0,
      summary: { passed: 0, failed: 1, skipped: 0, total: 1 },
    };
  }
}

function ResultSummary({ result }: { result?: TestResult }) {
  if (!result) return null;
  return <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black"><span className="text-emerald-500">{result.summary.passed} başarılı</span><span className="text-red-500">{result.summary.failed} başarısız</span><span className="text-amber-500">{result.summary.skipped} atlandı</span><span className="text-slate-500">{(result.durationMs / 1000).toFixed(1)} sn</span>{result.summary.failed > 0 || !result.ok ? <details className="basis-full pt-1"><summary className="w-fit cursor-pointer text-red-500 underline underline-offset-2">Hataları göster</summary><pre className="mt-2 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/90 p-4 text-left font-mono text-[11px] font-medium leading-5 text-slate-200">{result.output || result.error || "Hata ayrıntısı alınamadı."}</pre></details> : null}</div>;
}

export default function AdminTestsClient({ catalog, runToken }: { catalog: AdminTestCatalogEntry[]; runToken: string }) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

  const rows = useMemo(() => catalog.map((entry) => ({ ...entry, tests: entry.tests.filter((name) => !normalizedQuery || name.toLocaleLowerCase("tr-TR").includes(normalizedQuery) || entry.file.toLocaleLowerCase("tr-TR").includes(normalizedQuery)) })).filter((entry) => (filter === "all" || entry.type === filter) && entry.tests.length > 0), [catalog, filter, normalizedQuery]);
  const totalTests = catalog.reduce((sum, entry) => sum + entry.tests.length, 0);
  const unitTests = catalog.filter((entry) => entry.type === "unit").reduce((sum, entry) => sum + entry.tests.length, 0);
  const e2eTests = totalTests - unitTests;
  const card = isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white";
  const text = isDark ? "text-slate-100" : "text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  async function runTests(type: AdminTestCatalogEntry["type"], file?: string) {
    const runKey = file ?? type;
    setRunning(runKey);
    try {
      const response = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Admin-Test-Token": runToken },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ type, file }),
      });
      const start = await readApiPayload(response, type, file);
      let data = start as unknown as TestResult;
      if (typeof start.jobId === "string") {
        const deadline = Date.now() + 5 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          const pollResponse = await fetch(`/api/admin/tests?jobId=${encodeURIComponent(start.jobId)}`, {
            headers: { Accept: "application/json", "X-Admin-Test-Token": runToken },
            credentials: "same-origin",
            cache: "no-store",
          });
          const poll = await readApiPayload(pollResponse, type, file);
          if (poll.status === "completed" && poll.result && typeof poll.result === "object") {
            data = poll.result as unknown as TestResult;
            break;
          }
          if (!pollResponse.ok || poll.error) {
            data = poll as unknown as TestResult;
            break;
          }
        }
        if (!data.summary) {
          data = { ok: false, type, file: file ?? null, exitCode: 1, output: "Test işi beş dakika içinde tamamlanmadı.", durationMs: 300_000, summary: { passed: 0, failed: 1, skipped: 0, total: 1 } };
        }
      }
      setResults((current) => ({ ...current, [runKey]: { ...data, ok: response.ok && data.ok, type, file: file ?? null, exitCode: data.exitCode ?? 1, output: data.output ?? data.error ?? "Çıktı alınamadı.", durationMs: data.durationMs ?? 0, summary: data.summary ?? { passed: 0, failed: 1, skipped: 0, total: 1 } } }));
    } catch (error) {
      setResults((current) => ({ ...current, [runKey]: { ok: false, type, file: file ?? null, exitCode: 1, output: error instanceof Error ? error.message : "Test çalıştırılamadı.", durationMs: 0, summary: { passed: 0, failed: 1, skipped: 0, total: 1 } } }));
    } finally {
      setRunning(null);
    }
  }

  return <div className="space-y-6 px-4 py-8 sm:px-6">
    <div><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500"><FlaskConical size={21} /></div><div><h1 className={`text-xl font-black ${text}`}>Testler</h1><p className={`text-sm ${muted}`}>Projedeki otomatik testlerin envanteri.</p></div></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Test dosyası", value: catalog.length, icon: FileCode2 }, { label: "Toplam senaryo", value: totalTests, icon: TestTube2 }, { label: "Birim testi", value: unitTests, icon: CheckCircle2 }, { label: "Uçtan uca test", value: e2eTests, icon: FlaskConical }].map((item) => <div key={item.label} className={`rounded-2xl border p-5 ${card}`}><item.icon size={18} className="text-violet-500" /><p className={`mt-4 text-2xl font-black ${text}`}>{item.value}</p><p className={`mt-1 text-xs font-bold uppercase tracking-wider ${muted}`}>{item.label}</p></div>)}</div>
    <div className={`space-y-3 rounded-2xl border p-4 ${card}`}><div className="flex flex-wrap items-center gap-3"><button type="button" disabled={running !== null} onClick={() => void runTests("unit")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{running === "unit" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}Tüm birim testlerini çalıştır</button>{running === "unit" ? <span className={`text-xs font-bold ${muted}`}>Arka planda çalışıyor…</span> : <ResultSummary result={results.unit} />}</div><div className="flex flex-wrap items-center gap-3"><button type="button" disabled={running !== null} onClick={() => void runTests("e2e")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{running === "e2e" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}Tüm uçtan uca testleri çalıştır</button>{running === "e2e" ? <span className={`text-xs font-bold ${muted}`}>Arka planda çalışıyor…</span> : <ResultSummary result={results.e2e} />}</div></div>
    <div className={`rounded-2xl border p-4 ${card}`}><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dosya veya test senaryosu ara" aria-label="Testlerde ara" className={`h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm font-semibold outline-none focus:border-violet-500 ${isDark ? "border-white/10 text-white placeholder:text-slate-600" : "border-slate-200 text-slate-900 placeholder:text-slate-400"}`} /></label><div className="flex gap-2">{(["all", "unit", "e2e"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-xs font-black uppercase transition ${filter === value ? "bg-violet-600 text-white" : isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"}`}>{FILTER_LABELS[value]}</button>)}</div></div></div>
    <div className="space-y-4">{rows.map((entry) => <section key={entry.file} className={`overflow-hidden rounded-2xl border ${card}`}><div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${isDark ? "border-white/10" : "border-slate-200"}`}><div className="min-w-0"><h2 className={`truncate font-mono text-sm font-black ${text}`}>{entry.file}</h2><p className={`mt-1 text-xs ${muted}`}>{entry.tests.length} test senaryosu</p></div><div className="flex flex-wrap items-center justify-end gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${entry.type === "e2e" ? "bg-blue-500/15 text-blue-500" : "bg-emerald-500/15 text-emerald-500"}`}>{TYPE_LABELS[entry.type]}</span><button type="button" disabled={running !== null} onClick={() => void runTests(entry.type, entry.file)} title="Bu dosyadaki testleri çalıştır" className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{running === entry.file ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}Çalıştır</button>{running === entry.file ? <span className={`text-xs font-bold ${muted}`}>Arka planda çalışıyor…</span> : <ResultSummary result={results[entry.file]} />}</div></div><ol className={`divide-y ${isDark ? "divide-white/10" : "divide-slate-100"}`}>{entry.tests.map((name, index) => <li key={`${entry.file}-${name}`} className="flex gap-3 px-5 py-3"><span className={`font-mono text-xs ${muted}`}>{String(index + 1).padStart(2, "0")}</span><span className={`text-sm font-semibold ${text}`}>{name}</span></li>)}</ol></section>)}{rows.length === 0 ? <div className={`rounded-2xl border border-dashed py-16 text-center ${isDark ? "border-white/10" : "border-slate-200"}`}><Search size={24} className={`mx-auto ${muted}`} /><p className={`mt-3 text-sm font-bold ${muted}`}>Aramanızla eşleşen test bulunamadı.</p></div> : null}</div>
    <p className={`text-xs leading-5 ${muted}`}>Katalog derlemeden önce otomatik yenilenir. Birim testleri <code className="font-mono">npm test</code>, uçtan uca testler <code className="font-mono">npm run test:e2e</code> komutuyla çalıştırılır. Senaryo adları, kaynak koddaki teknik test adlarını gösterir.</p>
  </div>;
}
