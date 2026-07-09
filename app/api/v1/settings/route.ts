import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { canAccessFeature } from "@/lib/check-plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = sbAdmin();
  const { data, error } = await sb.from("user_settings").select("*").eq("user_id", auth.userId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data) return NextResponse.json({ settings: data });

  const { data: created, error: createError } = await sb
    .from("user_settings")
    .insert({ user_id: auth.userId })
    .select()
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json({ settings: created });
}

export async function PUT(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json();

  if (payload.custom_domain) {
    const allowed = await canAccessFeature(auth.userId, "custom_domain");
    if (!allowed) {
      return NextResponse.json({ error: "Custom domain ozelligi aktif bir Pro paket gerektirir." }, { status: 402 });
    }
  }

  if (payload.ga4_measurement_id || payload.gtm_container_id) {
    const allowed = await canAccessFeature(auth.userId, "tracking_integrations");
    if (!allowed) {
      return NextResponse.json({ error: "GA4 ve GTM entegrasyonlari aktif bir Pro paket gerektirir." }, { status: 402 });
    }
  }

  if (payload.webhook_url) {
    const allowed = await canAccessFeature(auth.userId, "webhooks");
    if (!allowed) {
      return NextResponse.json({ error: "Webhook entegrasyonu aktif bir Pro paket gerektirir." }, { status: 402 });
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const optionalFields = [
    "custom_domain",
    "ga4_measurement_id",
    "gtm_container_id",
    "webhook_url",
    "avatar_url",
    "billing_name",
    "company_name",
    "tax_office",
    "tax_number",
    "invoice_email",
    "billing_address",
    "billing_city",
    "billing_country",
    "notification_email",
    "security_contact_email",
  ] as const;

  for (const field of optionalFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      patch[field] = payload[field] ?? null;
    }
  }

  const { data, error } = await sbAdmin()
    .from("user_settings")
    .upsert({ user_id: auth.userId, ...patch }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
