import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrOwner } from "@/lib/admin-guard";

type AdminQrRow = {
  id: string;
  title: string;
  short_slug: string;
  qr_type: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  user_id: string | null;
};

function getAdminSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin: sb } = await requireAdminOrOwner(req);

    // Get all QR codes
    const { data: qrs, error } = await sb
      .from("qr_codes")
      .select("id, title, short_slug, qr_type, is_active, scan_count, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<AdminQrRow[]>();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get all users to map user_id → email
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const userMap: Record<string, string> = {};
    for (const u of users ?? []) {
      userMap[u.id] = u.user_metadata?.full_name || u.email || u.id;
    }

    const qrcodes = (qrs ?? []).map(q => ({
      ...q,
      user_email: q.user_id ? (userMap[q.user_id] ?? q.user_id) : "—",
    }));

    return NextResponse.json({ qrcodes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
