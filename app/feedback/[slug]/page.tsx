import { createClient } from "@supabase/supabase-js";
import FeedbackFormClient from "./FeedbackFormClient";
import { normalizeFeedbackConfig } from "@/lib/feedback";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function FeedbackPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const { data } = await getSupabaseAdmin()
    .from("qr_codes")
    .select("title,short_slug,is_active,dynamic_content")
    .eq("short_slug", slug)
    .maybeSingle();

  if (!data || data.is_active === false || data.dynamic_content?.kind !== "feedback") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Form bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu geri bildirim formu aktif değil veya kaldırılmış.</p>
        </div>
      </main>
    );
  }

  return <FeedbackFormClient slug={slug} title={data.title} config={normalizeFeedbackConfig(data.dynamic_content)} />;
}
