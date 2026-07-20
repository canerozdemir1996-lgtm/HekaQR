import { Barcode } from "lucide-react";

export default function ProductLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Barcode size={30} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-black">Ürün bilgileri hazırlanıyor</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Barkod ve ürün kaydı güvenli biçimde kontrol ediliyor.</p>
      </div>
    </main>
  );
}
