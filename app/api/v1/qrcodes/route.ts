import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { logAuditEvent } from "@/lib/middleware/auditLog";
import { createQrCodeSchema } from "@/lib/schemas/validationSchemas";
import { validateRequestBody } from "@/lib/middleware/validation";
import { checkRateLimit, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";

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

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return userId ? { userId } : null;
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

type ScanCountRow = { qr_id: string; scan_count: number | null };

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
  let query = sb
    .from("qr_codes")
    .select("id,title,short_slug,qr_type,is_active,scan_count,created_at,updated_at,style_id,folder_id,organization_id,user_id,tags,dynamic_content")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  query = orgIds.length
    ? query.or(`user_id.eq.${auth.userId},organization_id.in.(${orgIds.join(",")})`)
    : query.eq("user_id", auth.userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const qrIds = (data ?? []).map((row) => row.id);
  const scanCountMap = await loadScanCountMap(sb, qrIds).catch(() => loadScanCountMapFromLogs(sb, qrIds).catch(() => null));
  const qrcodes = (data ?? []).map(row => {
    const content = row.dynamic_content as { kind?: string } | null;
    return {
      ...row,
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
  const sb = sbAdmin();
  const dynamicKind = (payload.dynamic_content as { kind?: string } | null)?.kind;
  const isMenuPayload = payload.qr_type === "menu" || dynamicKind === "menu";
  const isFeedbackPayload = payload.qr_type === "feedback" || dynamicKind === "feedback";
  const smartKind = ["booking", "doc", "appstore"].includes(String(payload.qr_type)) ? payload.qr_type : dynamicKind;
  const isSmartPayload = ["booking", "doc", "appstore"].includes(String(smartKind));
  const dynamicContent = payload.is_dynamic !== false
    ? (isMenuPayload
      ? { ...(payload.dynamic_content ?? {}), kind: "menu" }
      : isFeedbackPayload
        ? { ...(payload.dynamic_content ?? {}), kind: "feedback" }
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

  if (payload.style_id) {
    const { data: visibleStyle } = await sb
      .from("qr_styles")
      .select("id,user_id,visibility,config")
      .eq("id", payload.style_id)
      .maybeSingle();
    if (!visibleStyle || (visibleStyle.user_id !== auth.userId && !["system", "public"].includes(visibleStyle.visibility))) {
      return NextResponse.json({ error: "Seçilen QR şablonuna erişiminiz yok." }, { status: 403 });
    }
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
    style_id: payload.style_id ?? null,
    qr_design: payload.qr_design ?? {},
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
  void logAuditEvent(sb, { user_id: auth.userId, action: "create", resource: "qr_code", resource_id: data.id, status: "success", status_code: 201, details: { title: data.title, slug: data.short_slug } });
  return NextResponse.json({ qrcode: data });
}

