import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { audienceSchema, buildBroadcastRows, resolveAudience } from "@/lib/admin/notifications";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";
import { isEmailChannelConfigured, sendBroadcastEmails } from "@/lib/email/resend";
import { sanitizeHtml } from "@/lib/utils/htmlSanitizer";

const BODY_MAX_TEXT_LENGTH = 500;
// Görsel <img> etiketleri metin karakteri saymaz ama URL'leri yer kaplar —
// kötüye kullanımı (çok sayıda görsel) önlemek için ham HTML üzerinde ayrı bir
// üst sınır.
const BODY_MAX_HTML_LENGTH = 20000;

export const dynamic = "force-dynamic";

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
  batch_id?: string | null;
  audience_type?: string | null;
  audience_label?: string | null;
  deleted_by_admin_at?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);

    // Dry-run mode: resolve an audience selector to a recipient count without
    // writing anything — used by the compose UI to preview "N kullanıcıya gönderilecek".
    if (url.searchParams.get("dryRun") === "1") {
      const rawAudience = url.searchParams.get("audience");
      const parsed = audienceSchema.safeParse(rawAudience ? JSON.parse(rawAudience) : null);
      if (!parsed.success) return NextResponse.json({ error: "Geçersiz hedef kitle." }, { status: 400 });
      try {
        const { recipients, label } = await resolveAudience(sbAdmin, parsed.data);
        return NextResponse.json({ count: recipients.length, label });
      } catch (e) {
        return NextResponse.json({ error: safeDbErrorMessage(e as { message: string }, "admin-messages.dryRun") }, { status: 500 });
      }
    }

    // Best-effort retention cleanup (no inbox UX; keep table small)
    try {
      await sbAdmin
        .from("admin_messages")
        .delete()
        .lt("created_at", isoDaysAgo(KEEP_DAYS));
    } catch { /* ignore */ }

    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));
    const to_user_id = url.searchParams.get("to_user_id");
    const includeDeleted = url.searchParams.get("includeDeleted") === "1";

    let q = sbAdmin
      .from("admin_messages")
      .select("id, created_at, from_user_id, to_user_id, title, body, popup_kind, read_at, batch_id, audience_type, audience_label, deleted_by_admin_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (to_user_id) q = q.eq("to_user_id", to_user_id);
    q = includeDeleted ? q.not("deleted_by_admin_at", "is", null) : q.is("deleted_by_admin_at", null);

    const { data, error } = await q.returns<AdminMessageRow[]>();
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "admin-messages.GET") }, { status: 500 });

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
// Body: { audience: Audience, title?: string, body: string, popup_kind?: "small" | "big" }
// (legacy) Body: { to_user_id: string, title?: string, body: string, popup_kind?: "small" | "big" }
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
    const title = String(payload?.title ?? "").trim().slice(0, 80) || "System Owner";
    const rawBody = String(payload?.body ?? "").trim();
    const bodyTextLength = rawBody.replace(/<[^>]+>/g, "").trim().length;
    const popup_kind = (String(payload?.popup_kind ?? "small").trim() || "small").toLowerCase();

    if (bodyTextLength === 0) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
    if (bodyTextLength > BODY_MAX_TEXT_LENGTH) return NextResponse.json({ error: `Mesaj ${BODY_MAX_TEXT_LENGTH} karakteri geçemez` }, { status: 400 });
    if (rawBody.length > BODY_MAX_HTML_LENGTH) return NextResponse.json({ error: "Mesaj içeriği (görseller dahil) çok büyük" }, { status: 400 });
    // Editör basit biçimlendirme (kalın/italik/altı çizili/liste) üretir; gelen
    // HTML'i izin verilen etiketler dışında her şeyi escape eden sanitizeHtml
    // ile temizliyoruz — admin paneli olsa da depolanan içerik kullanıcı
    // tarayıcısında dangerouslySetInnerHTML ile render ediliyor.
    const body = sanitizeHtml(rawBody);
    if (popup_kind !== "small" && popup_kind !== "big") {
      return NextResponse.json({ error: "popup_kind geçersiz" }, { status: 400 });
    }

    const rawAudience = payload?.audience ?? (payload?.to_user_id ? { type: "single", userId: String(payload.to_user_id) } : null);
    const parsedAudience = audienceSchema.safeParse(rawAudience);
    if (!parsedAudience.success) return NextResponse.json({ error: "Hedef kitle geçersiz." }, { status: 400 });

    let recipients: { userId: string }[];
    let audienceLabel: string;
    try {
      const resolved = await resolveAudience(sbAdmin, parsedAudience.data);
      recipients = resolved.recipients;
      audienceLabel = resolved.label;
    } catch (e) {
      return NextResponse.json({ error: safeDbErrorMessage(e as { message: string }, "admin-messages.resolveAudience") }, { status: 500 });
    }

    if (recipients.length === 0) return NextResponse.json({ error: "Bu kitlede kullanıcı bulunamadı." }, { status: 400 });

    const batchId = crypto.randomUUID();
    const rows = buildBroadcastRows(recipients, parsedAudience.data.type, audienceLabel, batchId, {
      fromUserId: actor.id,
      title,
      body,
      popupKind: popup_kind as "small" | "big",
    });

    const { error } = await sbAdmin.from("admin_messages").insert(rows as any);

    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "admin-messages.POST") }, { status: 500 });

    // E-posta kanalı opsiyonel — RESEND_API_KEY yoksa sessizce atlanır, in-app
    // bildirim zaten yukarıdaki insert ile garanti edildi. Yanıtı bloklamadan
    // best-effort gönder (gönderim hatası kullanıcıya başarısız gibi görünmesin).
    if (isEmailChannelConfigured()) {
      void (async () => {
        try {
          const { data: usersRes } = await sbAdmin.auth.admin.listUsers({ perPage: 1000 });
          const emailById = new Map((usersRes?.users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email]));
          const emailRecipients = recipients
            .map((r) => ({ email: emailById.get(r.userId), title, body }))
            .filter((r): r is { email: string; title: string; body: string } => Boolean(r.email));
          await sendBroadcastEmails(emailRecipients);
        } catch {
          // best-effort — e-posta katmanındaki hata yayın akışını etkilemez
        }
      })();
    }

    return NextResponse.json({ ok: true, sent: rows.length, label: audienceLabel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// DELETE /api/admin/messages?id=... | ?to_user_id=... | ?all=1
// Kalıcı silme değildir — deleted_by_admin_at damgalanır, PATCH ile geri
// alınabilir. Gerçek satır yalnızca KEEP_DAYS retention temizliğinde silinir.
export async function DELETE(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Best-effort retention cleanup (gerçek/kalıcı silme — soft-delete penceresi dolmuş kayıtlar)
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
    const now = new Date().toISOString();

    let q = sbAdmin.from("admin_messages").update({ deleted_by_admin_at: now });
    if (id) q = q.eq("id", id);
    else if (to_user_id) q = q.eq("to_user_id", to_user_id);
    else if (all === "1") q = q.lt("created_at", new Date(Date.now() + 1000).toISOString()); // all rows up to now
    else return NextResponse.json({ error: "id | to_user_id | all=1 zorunlu" }, { status: 400 });

    const { error } = await q;
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "admin-messages.DELETE") }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// PATCH /api/admin/messages?id=...&action=restore
export async function PATCH(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action");
    if (!id || action !== "restore") return NextResponse.json({ error: "id ve action=restore zorunlu" }, { status: 400 });

    const { error } = await sbAdmin.from("admin_messages").update({ deleted_by_admin_at: null }).eq("id", id);
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "admin-messages.PATCH") }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
