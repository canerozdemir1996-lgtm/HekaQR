import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { canAccessFeature } from "@/lib/check-plan";

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function randomKey() {
  return "qrk_" + crypto.randomBytes(24).toString("hex");
}

export async function POST(req: NextRequest) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userRes, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canAccessFeature(userRes.user.id, "api_access");
  if (!allowed) {
    return NextResponse.json({ error: "API anahtarı oluşturmak için aktif bir Pro paket gerekir." }, { status: 402 });
  }

  const { name } = await req.json().catch(() => ({ name: "Default" }));
  const key = randomKey();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await admin.from("api_keys").insert({
    user_id: userRes.user.id,
    name: (name ?? "API Key").toString().slice(0, 80),
    key_hash: sha256Hex(key),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Only returned once
  return NextResponse.json({ api_key: key });
}

