/**
 * GET /menu/[slug]/fallback
 *
 * Ana menü sayfası yüklenemediğinde (uygulama down/bakım) statik HTML snapshot döner.
 * Bu rota Supabase üzerinden doğrudan çalışabilir; Next.js app sunucusu düşse bile
 * nginx → Supabase REST API zinciri ile erişilebilir hale getirilebilir.
 *
 * Kullanım:
 *  - Direkt ziyaret: /menu/[slug]/fallback
 *  - Nginx bakım modu: error_page 502 503 504 → bu URL'ye yönlendir
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env eksik");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug) {
    return new NextResponse("Sayfa bulunamadı", { status: 404 });
  }

  try {
    const sb = getPublicSupabase();
    const { data, error } = await sb
      .from("menu_snapshots")
      .select("html, snapshot_at")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();

    if (error || !data?.html) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Menü Yüklenemedi</title></head>
<body style="font-family:system-ui;text-align:center;padding:40px">
  <h1>Menü şu anda kullanılamıyor</h1>
  <p>Lütfen daha sonra tekrar deneyin veya personelden yardım alın.</p>
</body></html>`,
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    return new NextResponse(data.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Tarayıcı 5 dk cache'lesin; CDN/nginx'te daha uzun olabilir
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "X-Snapshot-At": data.snapshot_at ?? "",
      },
    });
  } catch (err) {
    console.error("[fallback] snapshot okuma hatası:", err);
    return new NextResponse("Sunucu hatası", { status: 500 });
  }
}
