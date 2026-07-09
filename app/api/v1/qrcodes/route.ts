import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAuditEvent } from "@/lib/middleware/auditLog";
import { createQrCodeSchema } from "@/lib/schemas/validationSchemas";
import { validateRequestBody } from "@/lib/middleware/validation";
import { checkRateLimit, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { couponValidUntilToIso, normalizeCouponCode } from "@/lib/coupons";
import { isSchemaCompatError, safeDbErrorMessage } from "@/lib/server/api-helpers";
import { getVisibleQrTemplate, resolveQrTemplateId } from "@/lib/qr-templates";

export const dynamic = "force-dynamic";

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
  void sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  return { userId: data.user_id as string };
}

async function authRequest(req: NextRequest): Promise<{ userId: string } | null> {
  const apiAuth = await authApiKey(req);
  if (apiAuth) return apiAuth;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { userId: user.id } : null;
}

const ORG_ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

async function getActiveOrgMemberships(sb: ReturnType<typeof sbAdmin>, userId: string) {
  const { data, error } = await sb
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) return [];
  return (data ?? []) as { org_id: string; role: string }[];
}

async function getOrgRole(sb: ReturnType<typeof sbAdmin>, userId: string, orgId: string) {
  const { data, error } = await sb
    .from("organization_members")
    .select("role, status")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") return null;
  return data.role as string;
}

async function syncCouponCampaign(
  sb: ReturnType<typeof sbAdmin>,
  qr: { id: string; title: string; user_id: string },
  dynamicContent: Record<string, any> | null | undefined,
) {
  const content = dynamicContent ?? {};
  const code = normalizeCouponCode(String(content.code ?? ""));
  const discount = String(content.discount ?? "").trim();
  if (!code || !discount) return;

  const campaignRow = {
    qr_id: qr.id,
    user_id: qr.user_id,
    title: qr.title,
    discount,
    description: typeof content.description === "string" && content.description.trim() ? content.description.trim() : null,
    valid_until: couponValidUntilToIso(content.validUntil),
    updated_at: new Date().toISOString(),
  };

  const { data: campaign, error } = await sb
    .from("coupon_campaigns")
    .upsert(campaignRow, { onConflict: "qr_id" })
    .select("id")
    .single();

  if (error) {
    if (!isSchemaCompatError(error)) console.error("[qrcodes.POST] coupon campaign sync failed", error);
    return;
  }

  const { error: codeError } = await sb
    .from("coupon_codes")
    .upsert({ campaign_id: campaign.id, code, status: "active" }, { onConflict: "campaign_id,code", ignoreDuplicates: true });

  if (codeError && !isSchemaCompatError(codeError)) {
    console.error("[qrcodes.POST] coupon code sync failed", codeError);
  }
}

type ScanCountRow = { qr_id: string; scan_count: number | null };
type QrListRow = {
  id: string;
  title: string;
  short_slug: string;
  qr_type: string | null;
  is_active: boolean | null;
  scan_count: number | null;
  created_at: string;
  updated_at?: string | null;
  style_id?: string | null;
  folder_id?: string | null;
  organization_id?: string | null;
  user_id?: string | null;
  tags?: string[] | null;
  dynamic_content?: Record<string, unknown> | null;
};

async function loadScanCountMap(sb: ReturnType<typeof sbAdmin>, qrIds: string[]) {
  if (qrIds.length === 0) return new Map<string, number>();
  const { data, error } = await sb
    .from("qr_scan_counts")
    .select("qr_id,scan_count")
    .in("qr_id", qrIds)
    .returns<ScanCountRow[]>();
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.qr_id, Number(row.scan_count ?? 0)]));
}

// Bu fonksiyon kaldırıldı — qr_scan_counts view başarısız olduğunda
// (örn. PGRST002 schema cache hatası) 50K satır scan_logs sorgusu
// yük altında durumu daha da kötüleştiriyordu. qr_codes.scan_count
// kolonu fallback olarak yeterli.
function loadScanCountMapFromLogs(_sb: unknown, _qrIds: string[]): Promise<null> {
  return Promise.resolve(null);
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = sbAdmin();
  const orgs = await getActiveOrgMemberships(sb, auth.userId);
  const orgIds = orgs.map((org) => org.org_id).filter(Boolean);

  const applyOwnership = (query: any) => (
    orgIds.length
      ? query.or(`user_id.eq.${auth.userId},organization_id.in.(${orgIds.join(",")})`)
      : query.eq("user_id", auth.userId)
  );

  const fullColumns = "id,title,short_slug,qr_type,is_active,scan_count,created_at,updated_at,style_id,folder_id,organization_id,user_id,tags,dynamic_content";
  const minimalColumns = "id,title,short_slug,qr_type,is_active,scan_count,created_at,style_id,user_id";
  let { data, error } = await applyOwnership(
    sb
      .from("qr_codes")
      .select(fullColumns)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ) as { data: QrListRow[] | null; error: { message: string; code?: string } | null };

  if (error && isSchemaCompatError(error)) {
    const fallback = await applyOwnership(
      sb
        .from("qr_codes")
        .select(minimalColumns)
        .order("created_at", { ascending: false })
        .limit(500),
    ) as { data: QrListRow[] | null; error: { message: string; code?: string } | null };
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "qrcodes.GET") }, { status: 500 });
  const qrIds = (data ?? []).map((row) => row.id);
  const scanCountMap = await loadScanCountMap(sb, qrIds).catch(() => loadScanCountMapFromLogs(sb, qrIds).catch(() => null));
  const qrcodes = (data ?? []).map(row => {
    const content = row.dynamic_content as { kind?: string } | null;
    return {
      ...row,
      template_id: row.style_id ?? null,
      scan_count: scanCountMap?.get(row.id) ?? row.scan_count ?? 0,
      dynamic_content: content?.kind ? { kind: content.kind } : null,
    };
  });
  return NextResponse.json({ qrcodes }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`qr_create:${auth.userId}`, RATE_LIMITS.QR_CREATE.max, RATE_LIMITS.QR_CREATE.windowMs)) {
    return tooManyRequestsResponse();
  }

  // ── Plan enforcement ──
  try {
    const { assertCanCreateQR } = await import("@/lib/check-plan");
    await assertCanCreateQR(auth.userId);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, code: e.code ?? "PLAN_LIMIT", plan_info: e.planInfo ?? null },
      { status: 402 }
    );
  }

  const validation = await validateRequestBody(req, createQrCodeSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error.message, details: (validation.error as { details?: unknown }).details ?? null },
      { status: 400 }
    );
  }
  const payload = validation.data;

  // Multi URL: en az 1 link zorunlu — link'siz kayıt /links/[slug] 500'e yol açar
  const payloadKind = (payload.dynamic_content as { kind?: string; links?: unknown[] } | null);
  if ((payload.qr_type === "multi" || payloadKind?.kind === "multi")) {
    const links = Array.isArray(payloadKind?.links) ? payloadKind.links : [];
    const validLinks = links.filter((l: any) => typeof l?.url === "string" && l.url.trim());
    if (validLinks.length === 0) {
      return NextResponse.json({ error: "Multi URL QR en az bir geçerli link gerektiriyor." }, { status: 400 });
    }
  }

  const sb = sbAdmin();
  const dynamicKind = (payload.dynamic_content as { kind?: string } | null)?.kind;
  const isMenuPayload = payload.qr_type === "menu" || dynamicKind === "menu";
  const isFeedbackPayload = payload.qr_type === "feedback" || dynamicKind === "feedback";
  const isCouponPayload = payload.qr_type === "coupon" || dynamicKind === "coupon";
  const isExamPayload = payload.qr_type === "quiz" || dynamicKind === "exam";
  const smartKind = ["booking", "doc", "appstore"].includes(String(payload.qr_type)) ? payload.qr_type : dynamicKind;
  const isSmartPayload = ["booking", "doc", "appstore"].includes(String(smartKind));
  const dynamicContent = payload.is_dynamic !== false
    ? (isMenuPayload
      ? { ...(payload.dynamic_content ?? {}), kind: "menu" }
      : isFeedbackPayload
        ? { ...(payload.dynamic_content ?? {}), kind: "feedback" }
        : isCouponPayload
          ? { ...(payload.dynamic_content ?? {}), kind: "coupon" }
          : isExamPayload
            ? { ...(payload.dynamic_content ?? {}), kind: "exam" }
            : isSmartPayload
              ? { ...(payload.dynamic_content ?? {}), kind: smartKind }
              : (payload.dynamic_content ?? {}))
    : null;
  const organizationId = typeof payload.organization_id === "string" && payload.organization_id
    ? payload.organization_id
    : null;

  if (organizationId) {
    const role = await getOrgRole(sb, auth.userId, organizationId);
    if (!role || ORG_ROLE_RANK[role] < ORG_ROLE_RANK.editor) {
      return NextResponse.json({ error: "Bu organizasyonda QR oluşturma yetkiniz yok." }, { status: 403 });
    }
  }

  const templateId = resolveQrTemplateId(payload);
  const selectedTemplate = templateId
    ? await getVisibleQrTemplate(sb, auth.userId, templateId).catch(() => null)
    : null;

  if (templateId && !selectedTemplate) {
      return NextResponse.json({ error: "Seçilen QR şablonuna erişiminiz yok." }, { status: 403 });
  }

  const row = {
    user_id: auth.userId,
    organization_id: organizationId,
    title: payload.title,
    short_slug: payload.short_slug,
    target_url: payload.target_url,
    qr_type: payload.qr_type ?? "url",
    is_active: payload.is_active ?? true,
    scan_count: 0,
    style_id: templateId,
    qr_design: payload.qr_design ?? selectedTemplate?.config ?? {},
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
    is_dynamic: payload.is_dynamic ?? true,
    dynamic_content: dynamicContent,
    event_data: payload.event_data ?? null,
    location_data: payload.location_data ?? null,
    document_urls: payload.document_urls ?? [],
  };

  const { data, error } = await sb.from("qr_codes").insert(row).select().single();
  if (error) {
    void logAuditEvent(sb, { user_id: auth.userId, action: "create", resource: "qr_code", status: "failure", status_code: 400 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (data.qr_type === "coupon") {
    await syncCouponCampaign(sb, data, dynamicContent as Record<string, any> | null | undefined);
  }
  void logAuditEvent(sb, { user_id: auth.userId, action: "create", resource: "qr_code", resource_id: data.id, status: "success", status_code: 201, details: { title: data.title, slug: data.short_slug } });
  return NextResponse.json({ qrcode: { ...data, template_id: data.style_id ?? null } });
}
