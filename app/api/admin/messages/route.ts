import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";

const KEEP_DAYS = 30; // Increased from 7 to 30 days
function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

type AdminMessageRow = {
  id: string;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string;
  title: string;
  body: string;
  popup_kind?: "small" | "big" | string | null;
  read_at: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Best-effort retention cleanup (no inbox UX; keep table small)
    try {
      await sbAdmin
        .from("admin_messages")
        .delete()
        .lt("created_at", isoDaysAgo(KEEP_DAYS));
    } catch { /* ignore */ }

    const limit = Math.min(500, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 200)));
    const to_user_id = new URL(req.url).searchParams.get("to_user_id");

    let q = sbAdmin
      .from("admin_messages")
      .select("id, created_at, from_user_id, to_user_id, title, body, popup_kind, read_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (to_user_id) q = q.eq("to_user_id", to_user_id);

    const { data, error } = await q.returns<AdminMessageRow[]>();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Map user ids to emails/names for UI
    const ids = Array.from(new Set((data ?? []).flatMap(r => [r.to_user_id, r.from_user_id].filter(Boolean) as string[])));
    const { data: usersRes } = await sbAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userMap: Record<string, { email: string; full_name?: string }> = {};
    for (const u of usersRes.users ?? []) {
      userMap[u.id] = {
        email: u.email ?? u.id,
        full_name: (u.user_metadata?.full_name as string) ?? undefined,
      };
    }

    const messages = (data ?? []).map(m => ({
      ...m,
      to_user: userMap[m.to_user_id] ?? { email: m.to_user_id },
      from_user: m.from_user_id ? (userMap[m.from_user_id] ?? { email: m.from_user_id }) : null,
    }));

    return NextResponse.json({ messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// POST /api/admin/messages
// Body: { to_user_id: string, title?: string, body: string, popup_kind?: "small" | "big" }
export async function POST(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Best-effort retention cleanup
    try {
      await sbAdmin
        .from("admin_messages")
        .delete()
        .lt("created_at", isoDaysAgo(KEEP_DAYS));
    } catch { /* ignore */ }

    const payload = await req.json();
    const to_user_id = String(payload?.to_user_id ?? "").trim();
    const title = String(payload?.title ?? "").trim().slice(0, 80) || "System Owner";
    const body = String(payload?.body ?? "").trim().slice(0, 500);
    const popup_kind = (String(payload?.popup_kind ?? "small").trim() || "small").toLowerCase();

    if (!to_user_id) return NextResponse.json({ error: "to_user_id zorunlu" }, { status: 400 });
    if (!body) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
    if (popup_kind !== "small" && popup_kind !== "big") {
      return NextResponse.json({ error: "popup_kind geçersiz" }, { status: 400 });
    }

    const { error } = await sbAdmin.from("admin_messages").insert({
      from_user_id: actor.id,
      to_user_id,
      title,
      body,
      popup_kind,
    } as any);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// DELETE /api/admin/messages?id=... | ?to_user_id=... | ?all=1
export async function DELETE(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Best-effort retention cleanup
    try {
      await sbAdmin
        .from("admin_messages")
        .delete()
        .lt("created_at", isoDaysAgo(KEEP_DAYS));
    } catch { /* ignore */ }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const to_user_id = url.searchParams.get("to_user_id");
    const all = url.searchParams.get("all");

    let q = sbAdmin.from("admin_messages").delete();
    if (id) q = q.eq("id", id);
    else if (to_user_id) q = q.eq("to_user_id", to_user_id);
    else if (all === "1") q = q.lt("created_at", new Date(Date.now() + 1000).toISOString()); // all rows up to now
    else return NextResponse.json({ error: "id | to_user_id | all=1 zorunlu" }, { status: 400 });

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

