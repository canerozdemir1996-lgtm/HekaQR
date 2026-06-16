"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

function TableQrPrintContent() {
  const search = useSearchParams();
  const slug = (search.get("slug") || "").trim();
  const title = (search.get("title") || "Menü QR").trim();
  const count = Math.max(1, Math.min(200, Number(search.get("count") || 1)));
  const tables = useMemo(() => Array.from({ length: count }, (_, index) => index + 1), [count]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950">
          <ArrowLeft size={15}/> Dashboard
        </Link>
        <div className="text-center">
          <p className="text-sm font-black">{title}</p>
          <p className="text-xs font-semibold text-slate-500">{count} masa QR çıktısı</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
          <Printer size={15}/> Yazdır
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
        {!slug ? (
          <div className="rounded-2xl bg-white p-8 text-center font-bold text-red-500">QR slug bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-3 print:gap-0">
            {tables.map(tableNo => {
              const src = `/api/v1/qrcodes/render?slug=${encodeURIComponent(slug)}&format=png&size=700&table=${tableNo}`;
              return (
                <section key={tableNo} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm print:rounded-none print:border-slate-300 print:shadow-none">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Masa</p>
                  <h2 className="mt-1 text-4xl font-black">{tableNo}</h2>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Masa ${tableNo} QR`} className="mx-auto mt-3 aspect-square w-full max-w-[220px]" />
                  <p className="mt-3 text-sm font-black">{title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Kameranızla okutun, menüyü açın.</p>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function TableQrPrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 p-6 text-sm font-bold text-slate-500">Masa QR çıktısı hazırlanıyor...</div>}>
      <TableQrPrintContent />
    </Suspense>
  );
}
