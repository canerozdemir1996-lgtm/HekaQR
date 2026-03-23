import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function authApiKey(req: NextRequest): Promise<{ userId: string } | null> {
  const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!key) return null;
  const hash = sha256Hex(key);
  const sb = sbAdmin();
  const { data, error } = await sb
    .from("api_keys")
    .select("user_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  return { userId: data.user_id as string };
}

export async function GET(req: NextRequest) {
  const auth = await authApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = sbAdmin();
  const { data, error } = await sb
    .from("qr_codes")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ qrcodes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await req.json();
  const sb = sbAdmin();

  const row = {
    user_id: auth.userId,
    title: payload.title,
    short_slug: payload.short_slug,
    target_url: payload.target_url,
    qr_type: payload.qr_type ?? "url",
    is_active: payload.is_active ?? true,
    scan_count: 0,
    style_id: payload.style_id ?? null,
    pixel_id: payload.pixel_id ?? null,
    pixel_enabled: payload.pixel_enabled ?? false,
    password: payload.password ?? null,
    scan_limit: payload.scan_limit ?? null,
    expires_at: payload.expires_at ?? null,
    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_term: payload.utm_term ?? null,
    utm_content: payload.utm_content ?? null,
    redirect_type: payload.redirect_type ?? "302",
    ab_test_url: payload.ab_test_url ?? null,
    ab_test_weight: payload.ab_test_weight ?? null,
    tags: payload.tags ?? [],
    notes: payload.notes ?? null,
    vcard_data: payload.vcard_data ?? null,
    folder_id: payload.folder_id ?? null,
    rules: payload.rules ?? {},
    ga4_measurement_id: payload.ga4_measurement_id ?? null,
    gtm_container_id: payload.gtm_container_id ?? null,
    webhook_url: payload.webhook_url ?? null,
    // Dinamik QR desteği
    is_dynamic: payload.is_dynamic ?? false,
    dynamic_content: payload.is_dynamic ? (payload.dynamic_content ?? {}) : null,
    event_data: payload.event_data ?? null,
    location_data: payload.location_data ?? null,
    document_urls: payload.document_urls ?? [],
  };

  const { data, error } = await sb.from("qr_codes").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ qrcode: data });
}

