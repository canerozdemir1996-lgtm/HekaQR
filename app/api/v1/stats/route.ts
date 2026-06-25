import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = sbAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: rows, error: qrError } = await sb
    .from("qr_codes")
    .select("id, is_active")
    .eq("user_id", auth.userId)
    .is("deleted_at", null);
  if (qrError) return NextResponse.json({ error: qrError.message }, { status: 400 });

  const qrIds = (rows ?? []).map(row => row.id);
  let scansToday = 0;
  let totalScans = 0;
  if (qrIds.length > 0) {
    const [{ count: todayCount, error: todayError }, { count: totalCount, error: totalError }] = await Promise.all([
      sb
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .in("qr_id", qrIds)
        .gte("scanned_at", todayStart.toISOString()),
      sb
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .in("qr_id", qrIds),
    ]);
    if (todayError) return NextResponse.json({ error: todayError.message }, { status: 400 });
    if (totalError) return NextResponse.json({ error: totalError.message }, { status: 400 });
    scansToday = todayCount ?? 0;
    totalScans = totalCount ?? 0;
  }

  return NextResponse.json({
    stats: {
      total_qr: rows?.length ?? 0,
      active_qr: (rows ?? []).filter(row => row.is_active).length,
      total_scans: totalScans,
      scans_today: scansToday,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
