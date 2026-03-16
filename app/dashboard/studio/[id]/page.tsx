"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import QRStudio from "@/components/QRStudio";
import { fetchQrCode, saveStyle, updateQrCode, type QrCode } from "@/lib/supabase";

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [qr, setQr] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchQrCode(id).then(setQr).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (config: Record<string, unknown>) => {
    if (!qr) return;
    const style = await saveStyle(`${qr.title} - Stil`, config, qr.style_id ?? undefined);
    await updateQrCode(qr.id, { style_id: (style as { id: string }).id });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-violet-400" />
    </div>
  );

  if (error || !qr) return (
    <div className="min-h-screen bg-[#07090f] flex flex-col items-center justify-center gap-4 text-slate-400">
      <p>{error || "QR kodu bulunamadı"}</p>
      <button onClick={() => router.push("/dashboard")} className="text-sm text-violet-400 hover:underline">← Dashboard&apos;a dön</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090f]">
      <div className="fixed top-4 left-4 z-50">
        <button onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900/90 border border-white/10 text-slate-400 hover:text-slate-200 backdrop-blur transition-all">
          <ArrowLeft size={12} /> Dashboard
        </button>
      </div>
      <QRStudio initialUrl={qr.target_url} onSave={handleSave as never} />
    </div>
  );
}
