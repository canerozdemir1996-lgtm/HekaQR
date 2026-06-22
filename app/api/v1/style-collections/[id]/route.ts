import { NextRequest, NextResponse } from "next/server";
import { authRequest, routeParams, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await routeParams(context);
  const payload = await req.json().catch(() => ({}));
  const name = String(payload.name ?? "").trim();
  if (!name || name.length > 60) return NextResponse.json({ error: "1-60 karakter arasında bir koleksiyon adı girin." }, { status: 400 });

  const { data, error } = await sbAdmin()
    .from("qr_template_collections")
    .update({ name, description: String(payload.description ?? "").trim().slice(0, 240) || null })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("id,user_id,name,description,created_at,updated_at")
    .single();
  if (error?.code === "23505") return NextResponse.json({ error: "Bu isimde bir koleksiyonunuz zaten var." }, { status: 409 });
  if (error) return NextResponse.json({ error: "Koleksiyon güncellenemedi.", detail: error.message }, { status: 400 });
  return NextResponse.json({ collection: data });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await routeParams(context);
  const { error } = await sbAdmin().from("qr_template_collections").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: "Koleksiyon silinemedi.", detail: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
