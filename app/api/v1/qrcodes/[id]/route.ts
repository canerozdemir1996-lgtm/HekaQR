import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/middleware/auditLog";
import { updateQrCodeSchema } from "@/lib/schemas/validationSchemas";
import { validateRequestBody } from "@/lib/middleware/validation";
import { authRequest, routeParams, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

const ORG_ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

async function getOrgRole(sb: ReturnType<typeof sbAdmin>, userId: string, orgId: string | null | undefined) {
  if (!orgId) return null;
  const { data, error } = await sb
    .from("organization_members")
    .select("role, status")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") return null;
  return data.role as string;
}

async function canReadQr(sb: ReturnType<typeof sbAdmin>, userId: string, qr: { user_id?: string | null; organization_id?: string | null }) {
  if (qr.user_id === userId) return true;
  return Boolean(await getOrgRole(sb, userId, qr.organization_id));
}

async function canEditQr(sb: ReturnType<typeof sbAdmin>, userId: string, qr: { user_id?: string | null; organization_id?: string | null }) {
  if (qr.user_id === userId) return true;
  const role = await getOrgRole(sb, userId, qr.organization_id);
  return Boolean(role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.editor);
}

async function canDeleteQr(sb: ReturnType<typeof sbAdmin>, userId: string, qr: { user_id?: string | null; organization_id?: string | null }) {
  if (qr.user_id === userId) return true;
  const role = await getOrgRole(sb, userId, qr.organization_id);
  return Boolean(role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.admin);
}

// PUT: QR kodunu güncelle (dinamik içerik dahil)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const sb = sbAdmin();
  const { data, error } = await sb
    .from("qr_codes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canReadQr(sb, auth.userId, data))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ qrcode: data });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const validation = await validateRequestBody(req, updateQrCodeSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error.message, details: (validation.error as { details?: unknown }).details ?? null },
      { status: 400 }
    );
  }
  const payload = validation.data;
  const sb = sbAdmin();
  const dynamicKind = (payload.dynamic_content as { kind?: string } | null)?.kind;
  const isMenuPayload = payload.qr_type === "menu" || dynamicKind === "menu";
  const isFeedbackPayload = payload.qr_type === "feedback" || dynamicKind === "feedback";
  const smartKind = ["booking", "doc", "appstore"].includes(String(payload.qr_type)) ? payload.qr_type : dynamicKind;
  const isSmartPayload = ["booking", "doc", "appstore"].includes(String(smartKind));

  // Ownership check
  const { data: existing, error: checkError } = await sb
    .from("qr_codes")
    .select("user_id,organization_id")
    .eq("id", id)
    .maybeSingle();

  if (checkError || !existing || !(await canEditQr(sb, auth.userId, existing))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (payload.style_id) {
    const { data: visibleStyle } = await sb
      .from("qr_styles")
      .select("id,user_id,visibility")
      .eq("id", payload.style_id)
      .maybeSingle();
    if (!visibleStyle || (visibleStyle.user_id !== auth.userId && !["system", "public"].includes(visibleStyle.visibility))) {
      return NextResponse.json({ error: "Seçilen QR şablonuna erişiminiz yok." }, { status: 403 });
    }
  }

  // Dinamik QR güncellemesi
  const updateData: any = {};

  if (payload.organization_id !== undefined) {
    const nextOrgId = payload.organization_id || null;
    if (nextOrgId) {
      const role = await getOrgRole(sb, auth.userId, nextOrgId);
      if (!role || ORG_ROLE_RANK[role] < ORG_ROLE_RANK.editor) {
        return NextResponse.json({ error: "Bu organizasyonda QR paylaşma yetkiniz yok." }, { status: 403 });
      }
    }
    updateData.organization_id = nextOrgId;
  }
  
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.target_url !== undefined) updateData.target_url = payload.target_url;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
  if (payload.qr_type !== undefined) updateData.qr_type = payload.qr_type;
  if (payload.password !== undefined) updateData.password = payload.password;
  if (payload.scan_limit !== undefined) updateData.scan_limit = payload.scan_limit;
  if (payload.expires_at !== undefined) updateData.expires_at = payload.expires_at;
  if (payload.tags !== undefined) updateData.tags = payload.tags;
  if (payload.notes !== undefined) updateData.notes = payload.notes;
  if (payload.style_id !== undefined) updateData.style_id = payload.style_id;
  if (payload.pixel_id !== undefined) updateData.pixel_id = payload.pixel_id;
  if (payload.pixel_enabled !== undefined) updateData.pixel_enabled = payload.pixel_enabled;
  if (payload.utm_source !== undefined) updateData.utm_source = payload.utm_source;
  if (payload.utm_medium !== undefined) updateData.utm_medium = payload.utm_medium;
  if (payload.utm_campaign !== undefined) updateData.utm_campaign = payload.utm_campaign;
  if (payload.utm_term !== undefined) updateData.utm_term = payload.utm_term;
  if (payload.utm_content !== undefined) updateData.utm_content = payload.utm_content;
  if (payload.redirect_type !== undefined) updateData.redirect_type = payload.redirect_type;
  if (payload.ab_test_url !== undefined) updateData.ab_test_url = payload.ab_test_url;
  if (payload.ab_test_weight !== undefined) updateData.ab_test_weight = payload.ab_test_weight;
  if (payload.vcard_data !== undefined) updateData.vcard_data = payload.vcard_data;
  if (payload.folder_id !== undefined) updateData.folder_id = payload.folder_id;
  if (payload.rules !== undefined) updateData.rules = payload.rules;
  if (payload.webhook_url !== undefined) updateData.webhook_url = payload.webhook_url;

  // Dinamik QR spesifik alanlar
  if (payload.is_dynamic !== undefined) updateData.is_dynamic = payload.is_dynamic;
  else updateData.is_dynamic = true;
  if (payload.dynamic_content !== undefined) {
    updateData.dynamic_content = isMenuPayload
      ? { ...payload.dynamic_content, kind: "menu" }
      : isFeedbackPayload
        ? { ...payload.dynamic_content, kind: "feedback" }
        : isSmartPayload
          ? { ...payload.dynamic_content, kind: smartKind }
          : payload.dynamic_content;
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
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await sb.from("qr_codes").update(updateData).eq("id", id).select().single();

  if (error) {
    void logAuditEvent(sb, { user_id: auth.userId, action: "update", resource: "qr_code", resource_id: id, status: "failure", status_code: 400 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  void logAuditEvent(sb, { user_id: auth.userId, action: "update", resource: "qr_code", resource_id: id, status: "success" });
  return NextResponse.json({ qrcode: data });
}

// DELETE: QR kodunu sil
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const sb = sbAdmin();

  // Ownership check
  const { data: existing, error: checkError } = await sb
    .from("qr_codes")
    .select("user_id,organization_id")
    .eq("id", id)
    .maybeSingle();

  if (checkError || !existing || !(await canDeleteQr(sb, auth.userId, existing))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft delete: short_slug rezerve kalır, asla başka bir QR'a yeniden atanmaz.
  const { error } = await sb
    .from("qr_codes")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) {
    void logAuditEvent(sb, { user_id: auth.userId, action: "delete", resource: "qr_code", resource_id: id, status: "failure", status_code: 400 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  void logAuditEvent(sb, { user_id: auth.userId, action: "delete", resource: "qr_code", resource_id: id, status: "success" });
  return NextResponse.json({ success: true });
}
