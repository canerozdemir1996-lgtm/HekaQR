import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrOwner } from "@/lib/admin-guard";

function getAdminSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin: sb } = await requireAdminOrOwner(req);

    const [
      { data: { users } },
      { data: qrs },
      { data: scans },
    ] = await Promise.all([
      sb.auth.admin.listUsers({ perPage: 1000 }),
      sb.from("qr_codes").select("id, title, short_slug, scan_count, is_active, qr_type, created_at, user_id"),
      sb.from("scan_logs").select("scanned_at, device, country, qr_id").order("scanned_at", { ascending: false }).limit(5000),
    ]);

    const qrList = qrs ?? [];
    const scanList = scans ?? [];

    // Daily scans last 30 days
    const now = new Date();
    const dailyMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0,10)] = 0;
    }
    for (const s of scanList) {
      const day = (s.scanned_at as string).slice(0,10);
      if (day in dailyMap) dailyMap[day]++;
    }
    const daily_scans = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    // Top QR by scan count
    const top_qr = [...qrList]
      .sort((a, b) => (b.scan_count ?? 0) - (a.scan_count ?? 0))
      .slice(0, 10)
      .map(q => ({ title: q.title, short_slug: q.short_slug, scan_count: q.scan_count ?? 0 }));

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    for (const s of scanList) {
      const dev = (s.device as string) || "unknown";
      deviceMap[dev] = (deviceMap[dev] ?? 0) + 1;
    }
    const device_breakdown = Object.entries(deviceMap)
      .sort((a,b) => b[1]-a[1])
      .map(([device, count]) => ({ device, count }));

    // Country breakdown
    const countryMap: Record<string, number> = {};
    for (const s of scanList) {
      const c = (s.country as string) || "Bilinmiyor";
      countryMap[c] = (countryMap[c] ?? 0) + 1;
    }
    const country_breakdown = Object.entries(countryMap)
      .sort((a,b) => b[1]-a[1])
      .map(([country, count]) => ({ country, count }));

    const stats = {
      total_users: users?.length ?? 0,
      total_qr: qrList.length,
      active_qr: qrList.filter(q => q.is_active).length,
      total_scans: qrList.reduce((s, q) => s + (q.scan_count ?? 0), 0),
      daily_scans,
      top_qr,
      device_breakdown,
      country_breakdown,
    };

    return NextResponse.json({ stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
