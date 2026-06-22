import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sbAdmin()
    .from("qr_styles")
    .select("*")
    .or(`visibility.in.(system,public),user_id.eq.${auth.userId}`)
    .order("visibility", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ styles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json();
  const name = String(payload.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tasarım adı gerekli." }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: "Tasarım adı en fazla 60 karakter olabilir." }, { status: 400 });
  const category = String(payload.category ?? "custom").trim().slice(0, 40) || "custom";
  const collectionId = typeof payload.collection_id === "string" && payload.collection_id ? payload.collection_id : null;
  if (!payload.config || typeof payload.config !== "object" || Array.isArray(payload.config)) {
    return NextResponse.json({ error: "Geçerli bir QR tasarımı gerekli." }, { status: 400 });
  }

  if (collectionId) {
    const { data: collection } = await sbAdmin().from("qr_template_collections").select("id").eq("id", collectionId).eq("user_id", auth.userId).maybeSingle();
    if (!collection) return NextResponse.json({ error: "Koleksiyon bulunamadı." }, { status: 404 });
  }

  const { data, error } = await sbAdmin()
    .from("qr_styles")
    .insert({
      user_id: auth.userId,
      name,
      config: payload.config,
      category,
      collection_id: collectionId,
      description: String(payload.description ?? "").trim().slice(0, 240) || null,
      visibility: "private",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ style: data });
}
