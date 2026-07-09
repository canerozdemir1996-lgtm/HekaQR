import { NextResponse } from "next/server";

// Sadece development'ta çalışır
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Sadece development modunda kullanılabilir" }, { status: 403 });
  }

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: {
      set: !!url,
      valid: url?.startsWith("https://") && url?.includes(".supabase.co"),
      preview: url ? url.replace(/^(https:\/\/[^.]{6})[^.]+/, "$1***") : "EKSİK",
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      set: !!anonKey,
      valid: anonKey?.startsWith("eyJ") || anonKey?.startsWith("sb_publishable"),
      preview: anonKey ? anonKey.slice(0, 20) + "..." : "EKSİK",
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      set: !!serviceKey,
      valid: serviceKey?.startsWith("eyJ") || serviceKey?.startsWith("sb_secret"),
      preview: serviceKey ? "SET" : "EKSİK",
    },
  };

  // Supabase'e ping at
  let ping: { ok: boolean; status?: number; error?: string } = { ok: false };
  if (url) {
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: anonKey ?? "", Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(5000),
      });
      ping = { ok: res.ok || res.status === 404, status: res.status };
    } catch (e) {
      ping = { ok: false, error: String(e) };
    }
  }

  return NextResponse.json({ checks, ping, env: process.env.NODE_ENV });
}
