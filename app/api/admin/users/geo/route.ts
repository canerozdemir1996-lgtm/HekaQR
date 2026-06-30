import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { adminListUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ScanRow {
  qr_id: string;
  country: string | null;
}

interface QrRow {
  id: string;
  user_id: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin: sb } = await requireAdminOrOwner(req);

    const [{ data: qrs }, { data: scans }, users] = await Promise.all([
      sb.from("qr_codes").select("id, user_id").returns<QrRow[]>(),
      sb.from("scan_logs").select("qr_id, country").limit(5000).returns<ScanRow[]>(),
      adminListUsers(),
    ]);

    const qrToUser = new Map<string, string>();
    for (const qr of qrs ?? []) {
      if (qr.user_id) qrToUser.set(qr.id, qr.user_id);
    }

    const userById = new Map(users.map(u => [u.id, u]));

    // country -> { scans, userIds }
    const byCountry = new Map<string, { scans: number; userIds: Set<string> }>();

    for (const scan of scans ?? []) {
      const code = (scan.country || "").trim().toUpperCase();
      if (!code) continue;
      const userId = qrToUser.get(scan.qr_id);
      const entry = byCountry.get(code) ?? { scans: 0, userIds: new Set<string>() };
      entry.scans += 1;
      if (userId) entry.userIds.add(userId);
      byCountry.set(code, entry);
    }

    const countries = Array.from(byCountry.entries())
      .map(([code, entry]) => ({
        code,
        member_count: entry.userIds.size,
        scan_count: entry.scans,
        top_members: Array.from(entry.userIds)
          .map(id => userById.get(id))
          .filter((u): u is NonNullable<typeof u> => !!u)
          .slice(0, 8)
          .map(u => ({ id: u.id, email: u.email, full_name: u.full_name })),
      }))
      .sort((a, b) => b.member_count - a.member_count);

    const allReachedUserIds = new Set<string>();
    for (const entry of byCountry.values()) {
      for (const id of entry.userIds) allReachedUserIds.add(id);
    }

    return NextResponse.json({ countries, total_members_reached: allReachedUserIds.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
