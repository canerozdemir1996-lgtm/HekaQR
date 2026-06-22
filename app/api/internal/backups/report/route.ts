import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";

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

  const { error } = await sbAdmin().from("backup_runs").insert({
    kind,
    status,
    started_at: startedAt,
    size_bytes: sizeBytes,
    detail,
  });

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "backups.report") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
