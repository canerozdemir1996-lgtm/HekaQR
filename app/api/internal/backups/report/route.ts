import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";
import { roleFromMetadata } from "@/lib/auth";
import { isEmailChannelConfigured, sendBroadcastEmails } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

// GitHub Actions yedek workflow'ları (backup-db.yml, backup-storage.yml,
// restore-test.yml) her çalışmanın sonunda bu rotaya POST atar. Kimlik
// doğrulama paylaşılan bir token ile yapılır (kullanıcı oturumu yok, dışarıdan
// CI tetikler) — BACKUP_REPORT_TOKEN env değişkeni hem burada hem GitHub
// repo secrets'ında aynı olmalı.
function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const VALID_KIND = new Set(["db", "storage", "restore_test"]);
const VALID_STATUS = new Set(["success", "failed"]);

export async function POST(req: NextRequest) {
  const expected = process.env.BACKUP_REPORT_TOKEN?.trim();
  if (!expected) return NextResponse.json({ error: "BACKUP_REPORT_TOKEN yapılandırılmamış" }, { status: 503 });

  const token = req.headers.get("x-backup-token")?.trim();
  if (token !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const kind = String(payload?.kind ?? "");
  const status = String(payload?.status ?? "");
  if (!VALID_KIND.has(kind)) return NextResponse.json({ error: "kind geçersiz" }, { status: 400 });
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "status geçersiz" }, { status: 400 });

  const startedAt = payload?.started_at ? new Date(payload.started_at).toISOString() : null;
  const sizeBytes = Number.isFinite(Number(payload?.size_bytes)) ? Number(payload.size_bytes) : null;
  const detail = payload?.detail ? String(payload.detail).slice(0, 2000) : null;

  const sb = sbAdmin();
  const { error } = await sb.from("backup_runs").insert({
    kind,
    status,
    started_at: startedAt,
    size_bytes: sizeBytes,
    detail,
  });

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "backups.report") }, { status: 500 });

  // Başarısız yedek/restore-test çalışmaları için admin'lere uyarı —
  // önceden /admin/backups geçmişinde "Başarısız" satırı görünüyordu ama bunu
  // fark etmek tamamen kişinin paneli açmasına bağlıydı, hiçbir aktif
  // bildirim/alarm yoktu. Mevcut in-app mesaj sistemi (admin_messages) + e-posta
  // kanalı (varsa RESEND_API_KEY) kullanılıyor — response'u bloklamadan
  // best-effort.
  if (status === "failed") {
    void notifyAdminsOfBackupFailure(sb, kind, detail).catch((e) => {
      console.error("[backups.report] admin bildirimi gönderilemedi", e);
    });
  }

  return NextResponse.json({ ok: true });
}

const KIND_LABEL: Record<string, string> = {
  db: "Veritabanı Yedeği",
  storage: "Storage Yedeği",
  restore_test: "Geri Yükleme Testi",
};

async function notifyAdminsOfBackupFailure(
  sb: ReturnType<typeof sbAdmin>,
  kind: string,
  detail: string | null
) {
  const { data: usersRes, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const admins = (usersRes?.users ?? []).filter((u) => {
    const role = roleFromMetadata(u);
    return role === "owner" || role === "admin";
  });
  if (admins.length === 0) return;

  const title = `${KIND_LABEL[kind] ?? kind} başarısız`;
  const body = detail ? `<p>${detail}</p>` : "<p>Detay bilgisi alınamadı, lütfen GitHub Actions log'larını kontrol edin.</p>";

  const { error: insertError } = await sb.from("admin_messages").insert(
    admins.map((u) => ({
      from_user_id: null,
      to_user_id: u.id,
      title,
      body,
      popup_kind: "big" as const,
    }))
  );
  if (insertError) throw insertError;

  if (isEmailChannelConfigured()) {
    const recipients = admins
      .map((u) => ({ email: u.email, title, body }))
      .filter((r): r is { email: string; title: string; body: string } => Boolean(r.email));
    await sendBroadcastEmails(recipients);
  }
}
