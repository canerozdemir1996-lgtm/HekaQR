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

  const patch = {
    custom_domain: payload.custom_domain ?? null,
    ga4_measurement_id: payload.ga4_measurement_id ?? null,
    gtm_container_id: payload.gtm_container_id ?? null,
    webhook_url: payload.webhook_url ?? null,
    avatar_url: payload.avatar_url ?? null,
    billing_name: payload.billing_name ?? null,
    company_name: payload.company_name ?? null,
    tax_office: payload.tax_office ?? null,
    tax_number: payload.tax_number ?? null,
    invoice_email: payload.invoice_email ?? null,
    billing_address: payload.billing_address ?? null,
    billing_city: payload.billing_city ?? null,
    billing_country: payload.billing_country ?? null,
    payment_method_label: payload.payment_method_label ?? null,
    notification_email: payload.notification_email ?? null,
    security_contact_email: payload.security_contact_email ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sbAdmin()
    .from("user_settings")
    .upsert({ user_id: auth.userId, ...patch }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
