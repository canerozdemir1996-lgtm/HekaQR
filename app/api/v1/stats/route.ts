import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

// 60s process-level cache: stats don't need per-request freshness.
// Eliminates repeated scan_logs COUNT queries on the same user within a minute.
const _statsCache = new Map<string, { expiresAt: number; stats: object }>();

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cached = _statsCache.get(auth.userId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ stats: cached.stats }, { headers: { "Cache-Control": "no-store" } });
  }

  const sb = sbAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Fetch qr_codes with scan_count — eliminates the all-time scan_logs COUNT query.
  // scan_count is a denormalized counter maintained by a trigger; good enough for stats.
  const { data: rows, error: qrError } = await sb
    .from("qr_codes")
    .select("id, is_active, scan_count")
    .eq("user_id", auth.userId)
    .is("deleted_at", null);
  if (qrError) return NextResponse.json({ error: qrError.message }, { status: 400 });

  const qrIds = (rows ?? []).map(row => row.id);
  const totalScans = (rows ?? []).reduce((sum, r) => sum + (r.scan_count ?? 0), 0);

  let scansToday = 0;
  if (qrIds.length > 0) {
    const { count: todayCount, error: todayError } = await sb
      .from("scan_logs")
      .select("id", { count: "exact", head: true })
      .in("qr_id", qrIds)
      .gte("scanned_at", todayStart.toISOString());
    if (todayError) return NextResponse.json({ error: todayError.message }, { status: 400 });
    scansToday = todayCount ?? 0;
  }

  const stats = {
    total_qr: rows?.length ?? 0,
    active_qr: (rows ?? []).filter(row => row.is_active).length,
    total_scans: totalScans,
    scans_today: scansToday,
  };

  _statsCache.set(auth.userId, { expiresAt: Date.now() + 60_000, stats });

  return NextResponse.json({ stats }, { headers: { "Cache-Control": "no-store" } });
}
