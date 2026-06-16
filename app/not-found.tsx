import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export const metadata = {
  title: "404 | Sayfa Bulunamadı",
  description: "Aradığınız sayfa mevcut değil.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900">
      {/* Animated gradient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse animation-delay-2000" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full text-center">
        {/* 404 Text */}
        <div className="mb-8">
          <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400 mb-3">
            404
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sayfa Bulunamadı
          </h1>
          <p className="text-slate-300">
            Aradığınız sayfa mevcut değil veya yanlış bir URL girmiş olabilirsiniz.
          </p>
        </div>

        {/* Search suggestion */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Search size={16} />
            <span>Doğru URL&apos;yi kontrol edip tekrar deneyin</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/50 active:scale-95"
          >
            <Home size={18} />
            Dashboard&apos;a Git
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold transition-all hover:bg-white/[0.15] active:scale-95"
          >
            <ArrowLeft size={18} />
            Geri Dön
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-slate-500">
            Hata devam ederse,{" "}
            <a
              href="mailto:support@heka-qr.com"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              destek ekibimize
            </a>{" "}
            başvurun.
          </p>
        </div>
      </div>
    </div>
  );
}
