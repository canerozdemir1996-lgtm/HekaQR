import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { data, error } = await sbAdmin()
    .from("qr_template_collections")
    .select("id,user_id,name,description,created_at,updated_at,qr_styles(count)")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Koleksiyonlar yüklenemedi.", detail: error.message }, { status: 400 });
  return NextResponse.json({ collections: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim().slice(0, 240) || null;
  if (!name) return NextResponse.json({ error: "Koleksiyon adı gerekli." }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: "Koleksiyon adı en fazla 60 karakter olabilir." }, { status: 400 });

  const { data, error } = await sbAdmin()
    .from("qr_template_collections")
    .insert({ user_id: auth.userId, name, description })
    .select("id,user_id,name,description,created_at,updated_at")
    .single();

  if (error?.code === "23505") return NextResponse.json({ error: "Bu isimde bir koleksiyonunuz zaten var." }, { status: 409 });
  if (error) return NextResponse.json({ error: "Koleksiyon kaydedilemedi.", detail: error.message }, { status: 400 });
  return NextResponse.json({ collection: { ...data, qr_styles: [{ count: 0 }] } }, { status: 201 });
}
