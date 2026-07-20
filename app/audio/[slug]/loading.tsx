import { Music } from "lucide-react";

export default function AudioLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
          <Music size={30} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-black">Ses listesi hazırlanıyor</h1>
        <p className="mt-2 text-sm font-semibold text-slate-400">Bağlantı ve oynatılabilir dosyalar kontrol ediliyor.</p>
      </div>
    </main>
  );
}
