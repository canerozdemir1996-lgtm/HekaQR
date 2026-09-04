import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const payload = await req.json();
  const name = String(payload.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tasarım adı gerekli." }, { status: 400 });
  if (!payload.config || typeof payload.config !== "object" || Array.isArray(payload.config)) {
    return NextResponse.json({ error: "Geçerli bir QR tasarımı gerekli." }, { status: 400 });
  }

  const sb = sbAdmin();
  const { data, error } = await sb
    .from("qr_styles")
    .update({
      name: name.slice(0, 60),
      config: payload.config,
      category: String(payload.category ?? "custom").trim().slice(0, 40) || "custom",
      collection_id: typeof payload.collection_id === "string" && payload.collection_id ? payload.collection_id : null,
      description: String(payload.description ?? "").trim().slice(0, 240) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .eq("visibility", "private")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ style: data });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { error } = await sbAdmin().from("qr_styles").delete().eq("id", id).eq("user_id", auth.userId).eq("visibility", "private");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
