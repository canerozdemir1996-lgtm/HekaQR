import { NextRequest, NextResponse } from "next/server";
import { authRequest, routeParams, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const payload = await req.json();
  const name = String(payload.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tasarım adı gerekli." }, { status: 400 });

  const sb = sbAdmin();
  const { data, error } = await sb
    .from("qr_styles")
    .update({ name, config: payload.config ?? {}, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await sb
    .from("qr_codes")
    .update({ updated_at: new Date().toISOString() })
    .eq("style_id", id);
  return NextResponse.json({ style: data });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const { error } = await sbAdmin().from("qr_styles").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
