/**
 * POST /api/admin/backups/restore
 *
 * Güvenlik kontrolleri (sırayla):
 *  1. NextAuth oturumu + owner rolü
 *  2. MFA aktif ve doğrulanmış olmalı
 *  3. 2FA kodu bu istek içinde tekrar doğrulanır
 *  4. Body'de { confirm: "RESTORE" } zorunlu (UI confirmation)
 *  5. İşlem audit_logs'a yazılır
 *  6. restore_requests tablosuna kayıt eklenir
 *
 * Gerçek restore mekanizması: restore_requests tablosunu izleyen harici
 * bir GitHub Actions workflow / cron job tarafından tetiklenir.
 * Bu endpoint sadece güvenlik kontrolü + kayıt oluşturma yapar.
 */

import { NextRequest, NextResponse } from "next/server";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { validateMFACode } from "@/lib/services/mfaService";
import { clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  let actor: { id: string; role: string; email?: string };
  let sbAdmin: Awaited<ReturnType<typeof requireAdminOrOwner>>["sbAdmin"];

  try {
    const guard = await requireAdminOrOwner(req);
    actor = guard.actor;
    sbAdmin = guard.sbAdmin;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  // 1. Sadece owner erişebilir
  if (actor.role !== "owner") {
    return NextResponse.json({ error: "Bu işlem için System Owner yetkisi gerekli." }, { status: 403 });
  }

  // 2. Body'yi oku
  const body = await req.json().catch(() => ({})) as {
    totpCode?: string;
    confirm?: string;
    backupKind?: string;
    backupLabel?: string;
  };

  const { totpCode, confirm, backupKind, backupLabel } = body;

  // 3. Zorunlu onay metni
  if (confirm !== "RESTORE") {
    return NextResponse.json({ error: "Onay metni hatalı. Devam etmek için RESTORE yazın." }, { status: 400 });
  }

  // 4. 2FA aktif mi kontrol et
  const { data: mfaSettings, error: mfaCheckErr } = await sbAdmin
    .from("user_mfa_settings")
    .select("mfa_enabled, verified")
    .eq("user_id", actor.id)
    .maybeSingle();

  if (mfaCheckErr) {
    return NextResponse.json({ error: "MFA durumu doğrulanamadı." }, { status: 500 });
  }

  if (!mfaSettings?.mfa_enabled || !mfaSettings?.verified) {
    return NextResponse.json(
      { error: "Bu işlem için hesabınızda 2FA aktif olmalıdır.", code: "MFA_NOT_ACTIVE" },
      { status: 403 },
    );
  }

  // 5. Gelen 2FA kodunu doğrula
  if (!totpCode || totpCode.trim().length !== 6) {
    return NextResponse.json({ error: "Geçerli bir 2FA kodu girin." }, { status: 400 });
  }

  const isValidTotp = await validateMFACode(actor.id, totpCode.trim());
  if (!isValidTotp) {
    // Başarısız deneme audit log'a yaz
    await sbAdmin.from("audit_logs").insert({
      user_id: actor.id,
      action: "restore_request",
      resource: "backup",
      status: "failure",
      ip_address: ip,
      details: { reason: "invalid_totp", backup_kind: backupKind },
    }).then(() => null, () => null);

    return NextResponse.json({ error: "2FA kodu hatalı." }, { status: 401 });
  }

  // 6. Giriş doğrulamaları geçti — restore_requests'e kayıt ekle
  const kindSafe = (backupKind === "db" || backupKind === "storage") ? backupKind : "db";
  const labelSafe = String(backupLabel ?? "").slice(0, 200) || `${kindSafe}-${new Date().toISOString().slice(0, 10)}`;

  const { data: restoreReq, error: insertErr } = await sbAdmin
    .from("restore_requests")
    .insert({
      owner_id: actor.id,
      backup_kind: kindSafe,
      backup_label: labelSafe,
      status: "pending",
      ip_address: ip,
      notes: `Restore isteği gönderildi. Owner: ${actor.email ?? actor.id}`,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: safeDbErrorMessage(insertErr, "backups-restore.POST") }, { status: 500 });
  }

  // 7. Audit log
  await sbAdmin.from("audit_logs").insert({
    user_id: actor.id,
    action: "restore_request",
    resource: "backup",
    resource_id: restoreReq?.id,
    status: "success",
    ip_address: ip,
    details: {
      backup_kind: kindSafe,
      backup_label: labelSafe,
      restore_request_id: restoreReq?.id,
    },
  }).then(() => null, () => null);

  console.log(`[restore] owner=${actor.id} kind=${kindSafe} label=${labelSafe} request_id=${restoreReq?.id} ip=${ip}`);

  // GitHub Actions workflow'unu tetikle
  const ghToken = process.env.GITHUB_ACTIONS_TOKEN?.trim();
  const ghRepo = process.env.GITHUB_REPO?.trim(); // "owner/repo"
  if (ghToken && ghRepo) {
    try {
      const ghRes = await fetch(
        `https://api.github.com/repos/${ghRepo}/actions/workflows/restore.yml/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref: "main",
            inputs: {
              request_id: restoreReq?.id ?? "",
              backup_label: labelSafe,
              backup_kind: kindSafe,
            },
          }),
        },
      );
      if (!ghRes.ok) {
        const errText = await ghRes.text().catch(() => "");
        console.error(`[restore] GitHub dispatch failed: ${ghRes.status} ${errText.slice(0, 200)}`);
        // Workflow tetiklenemedi — request_id DB'de pending kalacak, admin görebilir
      } else {
        console.log(`[restore] GitHub workflow tetiklendi: ${ghRepo}`);
      }
    } catch (e) {
      console.error("[restore] GitHub dispatch exception:", e);
    }
  } else {
    console.warn("[restore] GITHUB_ACTIONS_TOKEN veya GITHUB_REPO eksik — workflow tetiklenemedi");
  }

  return NextResponse.json({
    ok: true,
    requestId: restoreReq?.id,
    message: ghToken && ghRepo
      ? "Geri yükleme isteği oluşturuldu ve GitHub Actions başlatıldı."
      : "Geri yükleme isteği oluşturuldu. (GitHub Actions yapılandırılmamış — GITHUB_ACTIONS_TOKEN ve GITHUB_REPO eksik)",
  });
}

export async function GET(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await sbAdmin
      .from("restore_requests")
      .select("id, backup_kind, backup_label, status, requested_at, completed_at, error")
      .order("requested_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: safeDbErrorMessage(error, "backups-restore.GET") }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
