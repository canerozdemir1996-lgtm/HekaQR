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
    .select("id, is_active, scan_count")
    .eq("user_id", auth.userId);
  if (qrError) return NextResponse.json({ error: qrError.message }, { status: 400 });

  const qrIds = (rows ?? []).map(row => row.id);
  let scansToday = 0;
  if (qrIds.length > 0) {
    const { count, error: scanError } = await sb
      .from("scan_logs")
      .select("id", { count: "exact", head: true })
      .in("qr_id", qrIds)
      .gte("scanned_at", todayStart.toISOString());
    if (scanError) return NextResponse.json({ error: scanError.message }, { status: 400 });
    scansToday = count ?? 0;
  }

  return NextResponse.json({
    stats: {
      total_qr: rows?.length ?? 0,
      active_qr: (rows ?? []).filter(row => row.is_active).length,
      total_scans: (rows ?? []).reduce((sum, row) => sum + (row.scan_count ?? 0), 0),
      scans_today: scansToday,
    },
  });
}
