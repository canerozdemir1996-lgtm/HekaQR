import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

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
  const patch = {
    custom_domain: payload.custom_domain ?? null,
    ga4_measurement_id: payload.ga4_measurement_id ?? null,
    gtm_container_id: payload.gtm_container_id ?? null,
    webhook_url: payload.webhook_url ?? null,
    avatar_url: payload.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sbAdmin()
    .from("user_settings")
    .update(patch)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
