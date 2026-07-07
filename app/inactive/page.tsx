import Link from "next/link";
import { QrCode, PauseCircle } from "lucide-react";

export const metadata = {
  title: "QR Pasif | QR Publish",
  description: "Bu QR kodu şu an aktif değil.",
};

export default function InactivePage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 rounded-full bg-slate-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 rounded-full bg-slate-500/10 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-md w-full text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center">
              <PauseCircle size={40} className="text-slate-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">QR Pasif</h1>
          <p className="text-slate-400">
            Bu QR kodu şu an devre dışı bırakılmış. İçerik sahibi tekrar aktif ettiğinde erişilebilir olacak.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <QrCode size={16} />
            <span>QR sahibine bu durumu bildirin</span>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold transition-all hover:bg-white/[0.15] active:scale-95"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
