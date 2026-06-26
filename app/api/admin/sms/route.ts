import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { adminListUsers } from "@/lib/auth";
import { audienceSchema, resolveAudience } from "@/lib/admin/notifications";
import { getActiveProvider, getSmsProviderStatuses, isSmsConfigured, sendSms } from "@/lib/notifications/sms";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

const MESSAGE_MAX_LENGTH = 459; // GSM-7 3 segment limiti

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

// GET /api/admin/sms?listUsers=1 — telefon bilgisiyle birlikte kullanıcı seçici listesi
// GET /api/admin/sms?dryRun=1&audience=... — hedef kitle + telefonu olan/olmayan sayısı önizlemesi
export async function GET(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);

    if (url.searchParams.get("listUsers") === "1") {
      const [users, profilesResult] = await Promise.all([
        adminListUsers(),
        sbAdmin.from("profiles").select("user_id, phone"),
      ]);
      const phoneByUser = new Map((profilesResult.data ?? []).map((p: { user_id: string; phone: string | null }) => [p.user_id, p.phone]));
      const list = users.map(u => ({ id: u.id, email: u.email, full_name: u.full_name, phone: phoneByUser.get(u.id) ?? null }));
      return NextResponse.json({ users: list });
    }

    if (url.searchParams.get("dryRun") === "1") {
      const rawAudience = url.searchParams.get("audience");
      const parsed = audienceSchema.safeParse(rawAudience ? JSON.parse(rawAudience) : null);
      if (!parsed.success) return NextResponse.json({ error: "Geçersiz hedef kitle." }, { status: 400 });
      try {
        const { recipients, label } = await resolveAudience(sbAdmin, parsed.data);
        const ids = recipients.map(r => r.userId);
        const { data: profiles, error } = ids.length
          ? await sbAdmin.from("profiles").select("user_id, phone").in("user_id", ids)
          : { data: [], error: null };
        if (error) throw error;
        const withPhone = (profiles ?? []).filter((p: { phone: string | null }) => p.phone?.trim()).length;
        return NextResponse.json({ count: recipients.length, withPhone, label });
      } catch (e) {
        return NextResponse.json({ error: safeDbErrorMessage(e as { message: string }, "admin-sms.dryRun") }, { status: 500 });
      }
    }

    if (url.searchParams.get("status") === "1") {
      const statuses = getSmsProviderStatuses();
      const active = getActiveProvider();
      const testMode = process.env.SMS_TEST_MODE === "true";
      return NextResponse.json({ providers: statuses, activeProvider: active, testMode, configured: isSmsConfigured() });
    }

    return NextResponse.json({ error: "listUsers=1, dryRun=1 veya status=1 zorunlu" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/admin/sms
// Body: { audience: Audience, message: string }
// Body: { test: true, to: string, message: string } → tek kişiye test SMS
export async function POST(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!isSmsConfigured()) {
      return NextResponse.json({ error: "SMS altyapısı henüz yapılandırılmamış. .env.local dosyasına sağlayıcı bilgilerini ekleyin." }, { status: 409 });
    }

    const payload = await req.json().catch(() => ({}));

    // Test SMS — tek numaraya doğrudan gönderim
    if (payload?.test === true) {
      const to = String(payload?.to ?? "").trim();
      const message = String(payload?.message ?? "Test SMS — QR Publish").trim();
      if (!to) return NextResponse.json({ error: "Telefon numarası zorunlu." }, { status: 400 });
      try {
        const result = await sendSms({ to, message });
        return NextResponse.json({ ok: result.delivered, provider: result.provider });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "SMS gönderilemedi." }, { status: 500 });
      }
    }
    const message = String(payload?.message ?? "").trim();
    if (!message) return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
    if (message.length > MESSAGE_MAX_LENGTH) {
      return NextResponse.json({ error: `Mesaj ${MESSAGE_MAX_LENGTH} karakteri geçemez.` }, { status: 400 });
    }

    const parsedAudience = audienceSchema.safeParse(payload?.audience);
    if (!parsedAudience.success) return NextResponse.json({ error: "Hedef kitle geçersiz." }, { status: 400 });

    let recipientIds: string[];
    let audienceLabel: string;
    try {
      const resolved = await resolveAudience(sbAdmin, parsedAudience.data);
      recipientIds = resolved.recipients.map(r => r.userId);
      audienceLabel = resolved.label;
    } catch (e) {
      return NextResponse.json({ error: safeDbErrorMessage(e as { message: string }, "admin-sms.resolveAudience") }, { status: 500 });
    }

    if (recipientIds.length === 0) return NextResponse.json({ error: "Bu kitlede kullanıcı bulunamadı." }, { status: 400 });

    const { data: profiles, error: profilesError } = await sbAdmin
      .from("profiles")
      .select("user_id, phone")
      .in("user_id", recipientIds);
    if (profilesError) {
      return NextResponse.json({ error: safeDbErrorMessage(profilesError, "admin-sms.profiles") }, { status: 500 });
    }

    const phoneByUser = new Map((profiles ?? []).map((p: { user_id: string; phone: string | null }) => [p.user_id, p.phone?.trim() || null]));

    let sent = 0;
    let failed = 0;
    let skippedNoPhone = 0;
    const details: Array<{ userId: string; status: "sent" | "failed" | "no_phone" }> = [];

    for (const userId of recipientIds) {
      const phone = phoneByUser.get(userId) ?? null;
      if (!phone) {
        skippedNoPhone += 1;
        details.push({ userId, status: "no_phone" });
        continue;
      }
      try {
        const result = await sendSms({ to: phone, message });
        if (result.delivered) {
          sent += 1;
          details.push({ userId, status: "sent" });
        } else {
          failed += 1;
          details.push({ userId, status: "failed" });
        }
      } catch (err) {
        console.error("[admin-sms.POST] sendSms failed", { userId, message: err instanceof Error ? err.message : String(err) });
        failed += 1;
        details.push({ userId, status: "failed" });
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      skipped_no_phone: skippedNoPhone,
      label: audienceLabel,
      details: details.slice(0, 100),
    });
  } catch (error) {
    return jsonError(error);
  }
}
