import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

type BackupRunRow = {
  id: string;
  kind: "db" | "storage" | "restore_test";
  status: "success" | "failed";
  started_at: string | null;
  finished_at: string;
  size_bytes: number | null;
  detail: string | null;
};

// Her yedek türü için "ne kadar süredir başarılı yedek alınmadı" eşiği.
// Cron zamanlamasının (backup-db: günlük, backup-storage: günlük,
// restore-test: aylık) biraz üzerinde — tek bir geç çalışma yanlış alarm
// vermesin.
const STALE_AFTER_HOURS: Record<BackupRunRow["kind"], number> = {
  db: 30,
  storage: 30,
  restore_test: 24 * 35,
};

export async function GET(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await sbAdmin
      .from("backup_runs")
      .select("id, kind, status, started_at, finished_at, size_bytes, detail")
      .order("finished_at", { ascending: false })
      .limit(200)
      .returns<BackupRunRow[]>();

    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "admin-backups.GET") }, { status: 500 });

    const rows = data ?? [];
    const now = Date.now();
    const kinds: BackupRunRow["kind"][] = ["db", "storage", "restore_test"];
    const summary = kinds.map((kind) => {
      const lastSuccess = rows.find((r) => r.kind === kind && r.status === "success");
      const last = rows.find((r) => r.kind === kind);
      const hoursSinceSuccess = lastSuccess
        ? (now - new Date(lastSuccess.finished_at).getTime()) / (1000 * 60 * 60)
        : null;
      return {
        kind,
        lastSuccessAt: lastSuccess?.finished_at ?? null,
        lastRunAt: last?.finished_at ?? null,
        lastRunStatus: last?.status ?? null,
        stale: hoursSinceSuccess === null || hoursSinceSuccess > STALE_AFTER_HOURS[kind],
      };
    });

    return NextResponse.json({ runs: rows, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
