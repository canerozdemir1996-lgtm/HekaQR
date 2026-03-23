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

// PUT: QR kodunu güncelle (dinamik içerik dahil)
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const payload = await req.json();
  const sb = sbAdmin();

  // Ownership check
  const { data: existing, error: checkError } = await sb
    .from("qr_codes")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (checkError || !existing || existing.user_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Dinamik QR güncellemesi
  const updateData: any = {};
  
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.target_url !== undefined) updateData.target_url = payload.target_url;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
  if (payload.qr_type !== undefined) updateData.qr_type = payload.qr_type;
  if (payload.password !== undefined) updateData.password = payload.password;
  if (payload.scan_limit !== undefined) updateData.scan_limit = payload.scan_limit;
  if (payload.expires_at !== undefined) updateData.expires_at = payload.expires_at;
  if (payload.tags !== undefined) updateData.tags = payload.tags;
  if (payload.notes !== undefined) updateData.notes = payload.notes;

  // Dinamik QR spesifik alanlar
  if (payload.is_dynamic !== undefined) updateData.is_dynamic = payload.is_dynamic;
  if (payload.is_dynamic && payload.dynamic_content !== undefined) {
    updateData.dynamic_content = payload.dynamic_content;
  }

  // Yeni QR türleri
  if (payload.event_data !== undefined) updateData.event_data = payload.event_data;
  if (payload.location_data !== undefined) updateData.location_data = payload.location_data;
  if (payload.document_urls !== undefined) updateData.document_urls = payload.document_urls;

  // Logo & Tasarım
  if (payload.logo_url !== undefined) updateData.logo_url = payload.logo_url;
  if (payload.frame_style !== undefined) updateData.frame_style = payload.frame_style;
  if (payload.qr_design !== undefined) updateData.qr_design = payload.qr_design;

  // Analytics alanları
  if (payload.ga4_measurement_id !== undefined) updateData.ga4_measurement_id = payload.ga4_measurement_id;
  if (payload.gtm_container_id !== undefined) updateData.gtm_container_id = payload.gtm_container_id;

  const { data, error } = await sb.from("qr_codes").update(updateData).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ qrcode: data });
}

// DELETE: QR kodunu sil
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const sb = sbAdmin();

  // Ownership check
  const { data: existing, error: checkError } = await sb
    .from("qr_codes")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (checkError || !existing || existing.user_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await sb.from("qr_codes").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
