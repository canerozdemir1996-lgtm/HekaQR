import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export const dynamic = "force-dynamic";

function getSbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchTextQr(slug: string) {
  const { data } = await getSbAdmin()
    .from("qr_codes")
    .select("title,short_slug,is_active,qr_type,target_url")
    .ilike("short_slug", slug)
    .maybeSingle();
  return data as { title: string; short_slug: string; is_active: boolean; qr_type: string | null; target_url: string | null } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const qr = await fetchTextQr(slug);
  return { title: qr?.title || "Metin QR" };
}

export default async function TextQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const qr = await fetchTextQr(slug);

  if (!qr || qr.qr_type !== "text") notFound();
  if (qr.is_active === false) redirect("/inactive");

  const text = qr.target_url || "";

  if (!text.trim()) {
    return (
      <PublicQrStatusPage
        locale="tr"
        tone="error"
        eyebrow="İçerik eklenmemiş"
        title="Metin içeriği boş"
        description="Bu QR koduna henüz görüntülenecek bir metin eklenmemiş."
        ownerHint="İçerik sahibinden güncel metni eklemesini isteyin veya destek ekibine ulaşın."
      />
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <FileText size={28} className="text-violet-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-6">{qr.title}</h1>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left">
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
