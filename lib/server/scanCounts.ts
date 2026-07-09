import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseLike = SupabaseClient<any>;

export type ScanCountMap = Map<string, number>;

export async function loadScanCountMap(sb: SupabaseLike, qrIds: string[]): Promise<ScanCountMap> {
  const ids = Array.from(new Set(qrIds.filter(Boolean)));
  if (ids.length === 0) return new Map();

  const counts = new Map<string, number>();
  const { data, error } = await sb
    .from("qr_scan_counts")
    .select("qr_id,scan_count")
    .in("qr_id", ids)
    .returns<Array<{ qr_id: string; scan_count: number | null }>>();

  if (!error) {
    for (const row of data ?? []) counts.set(row.qr_id, Number(row.scan_count ?? 0));
    for (const id of ids) if (!counts.has(id)) counts.set(id, 0);
    return counts;
  }

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const fallback = await sb
      .from("scan_logs")
      .select("qr_id")
      .in("qr_id", chunk)
      .limit(50_000)
      .returns<Array<{ qr_id: string }>>();
    if (fallback.error) throw fallback.error;
    for (const row of fallback.data ?? []) counts.set(row.qr_id, (counts.get(row.qr_id) ?? 0) + 1);
    for (const id of chunk) if (!counts.has(id)) counts.set(id, 0);
  }

  return counts;
}

export async function loadScanCount(sb: SupabaseLike, qrId: string): Promise<number> {
  return (await loadScanCountMap(sb, [qrId])).get(qrId) ?? 0;
}

export async function loadUserScanStats(sb: SupabaseLike, userId: string) {
  const { data: qrs, error } = await sb
    .from("qr_codes")
    .select("id,is_active")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .returns<Array<{ id: string; is_active: boolean | null }>>();

  if (error) throw error;

  const qrIds = (qrs ?? []).map((qr) => qr.id);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let totalScans = 0;
  let scansToday = 0;

  if (qrIds.length > 0) {
    const [{ count: allCount, error: allError }, { count: todayCount, error: todayError }] = await Promise.all([
      sb.from("scan_logs").select("id", { count: "exact", head: true }).in("qr_id", qrIds),
      sb.from("scan_logs").select("id", { count: "exact", head: true }).in("qr_id", qrIds).gte("scanned_at", todayStart.toISOString()),
    ]);
    if (allError) throw allError;
    if (todayError) throw todayError;
    totalScans = allCount ?? 0;
    scansToday = todayCount ?? 0;
  }

  return {
    total_qr: qrs?.length ?? 0,
    active_qr: (qrs ?? []).filter((qr) => qr.is_active).length,
    total_scans: totalScans,
    scans_today: scansToday,
  };
}
