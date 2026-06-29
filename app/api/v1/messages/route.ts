import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

// Bu rota, admin_messages tablosunu OTURUM SAHİBİ KULLANICI için okur/günceller.
// Tarayıcıdan doğrudan Supabase istemcisiyle (RLS + auth.uid()) okumak bu
// uygulamada işe yaramaz — giriş tamamen NextAuth ile yapılıyor, Supabase'in
// kendi auth oturumu tarayıcıda hiç kurulmuyor, dolayısıyla auth.uid() = null
// olur ve RLS her satırı engeller. Diğer her v1 rotasında olduğu gibi NextAuth
// oturumunu burada doğrulayıp servis anahtarıyla okuyoruz.
function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

type MessageRow = {
  id: string;
  created_at: string;
  title: string | null;
  body: string | null;
  popup_kind: string | null;
  read_at: string | null;
};

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = sbAdmin();
  const { searchParams } = req.nextUrl;

  if (searchParams.get("countOnly") === "1") {
    const { count, error } = await sb
      .from("admin_messages")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", userId)
      .is("read_at", null)
      .is("deleted_by_user_at", null);
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "v1.messages.GET.count") }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  let q = sb
    .from("admin_messages")
    .select("id, created_at, title, body, popup_kind, read_at")
    .eq("to_user_id", userId)
    .is("deleted_by_user_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.get("unreadOnly") === "1") {
    q = q.is("read_at", null);
  }

  const { data, error } = await q.returns<MessageRow[]>();

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "v1.messages.GET") }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

// PATCH /api/v1/messages?id=...&action=read
export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const action = searchParams.get("action");
  if (!id || action !== "read") return NextResponse.json({ error: "id ve action=read zorunlu" }, { status: 400 });

  const { error } = await sbAdmin()
    .from("admin_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("to_user_id", userId);

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "v1.messages.PATCH") }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/v1/messages?id=...  (soft-delete, kullanıcı tarafı)
export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  const { error } = await sbAdmin()
    .from("admin_messages")
    .update({ deleted_by_user_at: new Date().toISOString() })
    .eq("id", id)
    .eq("to_user_id", userId);

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "v1.messages.DELETE") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
