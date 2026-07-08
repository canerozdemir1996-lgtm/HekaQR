import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { sbAdmin, safeDbErrorMessage } from "@/lib/server/api-helpers";
import { canAccessFeature } from "@/lib/check-plan";

export const dynamic = "force-dynamic";

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function randomKey() {
  return "qrk_" + crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sbAdmin()
    .from("api_keys")
    .select("id,name,created_at,last_used_at,revoked_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "keys.GET") }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canAccessFeature(session.user.id, "api_access");
  if (!allowed) {
    return NextResponse.json({ error: "API anahtarı oluşturmak için aktif bir Pro paket gerekir." }, { status: 402 });
  }

  const { name } = await req.json().catch(() => ({ name: "Default" }));
  const key = randomKey();

  const { data, error } = await sbAdmin()
    .from("api_keys")
    .insert({
      user_id: session.user.id,
      name: (name ?? "API Key").toString().trim().slice(0, 80) || "API Key",
      key_hash: sha256Hex(key),
    })
    .select("id,name,created_at")
    .single();

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "keys.POST") }, { status: 500 });

  // api_key sadece bu cevapta bir kez gösterilir — sunucu sadece hash'ini saklar.
  return NextResponse.json({ api_key: key, key: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Anahtar id zorunlu." }, { status: 400 });

  const { error } = await sbAdmin()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "keys.DELETE") }, { status: 500 });
  return NextResponse.json({ revoked: true });
}
