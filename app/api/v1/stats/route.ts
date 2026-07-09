import { NextRequest, NextResponse } from "next/server";
import { authRequest, isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { loadUserScanStats } from "@/lib/server/scanCounts";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const auth = await authRequest(_req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stats = await loadUserScanStats(sbAdmin(), auth.userId);
    return NextResponse.json({ stats }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const dbError = error as { message?: string | null; code?: string | null };
    if (isSchemaCompatError(dbError)) {
      return NextResponse.json(
        { stats: { total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 }, compatibility: "schema_pending" },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    return NextResponse.json({ error: safeDbErrorMessage({ message: String(dbError.message ?? error), code: dbError.code ?? undefined }, "stats.GET") }, { status: 500 });
  }
}
