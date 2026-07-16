import { NextRequest, NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { loadScanCountMap } from "@/lib/server/scanCounts";

export const dynamic = "force-dynamic";

type QrRow = {
  id: string;
  title: string;
  short_slug: string;
  folder_id: string | null;
  qr_type: string | null;
  is_active: boolean | null;
  scan_count: number | null;
  created_at: string;
};

type FolderRow = {
  id: string;
  name: string;
  created_at: string;
};

type ScanRow = {
  id: number;
  qr_id: string;
  scanned_at: string;
  device: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  fingerprint: string | null;
};

function toPairs(map: Map<string, number>, label: string, limit = 12) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ [label]: name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function inc(map: Map<string, number>, key: string | null | undefined) {
  const value = key?.trim() || "Bilinmiyor";
  map.set(value, (map.get(value) ?? 0) + 1);
}

function detectBrowser(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) return "Safari";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  return "Bilinmiyor";
}

function reportRows(scans: ScanRow[], qrById: Map<string, QrRow>) {
  return scans.map((scan) => {
    const qr = qrById.get(scan.qr_id);
    return {
      "QR Başlığı": qr?.title ?? "Silinmiş QR",
      Slug: qr?.short_slug ?? "",
      Ülke: scan.country ?? "Bilinmiyor",
      Şehir: scan.city ?? "Bilinmiyor",
      Cihaz: scan.device ?? "Bilinmiyor",
      OS: scan.os ?? "Bilinmiyor",
      Tarayıcı: detectBrowser(scan.user_agent),
      Tarih: new Date(scan.scanned_at).toLocaleString("tr-TR"),
    };
  });
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = req.nextUrl.searchParams.get("folder") ?? "all";
  const qrId = req.nextUrl.searchParams.get("qr") ?? "all";
  const daysRaw = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const pageRaw = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, daysRaw)) : 30;
  const limit = [20, 50, 100].includes(limitRaw) ? limitRaw : 20;
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const customFrom = fromParam ? new Date(`${fromParam}T00:00:00`) : null;
  const customTo = toParam ? new Date(`${toParam}T23:59:59.999`) : null;
  const since = customFrom && !Number.isNaN(+customFrom) ? customFrom : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const until = customTo && !Number.isNaN(+customTo) ? customTo : new Date();
  const sb = sbAdmin();

  const [{ data: folders, error: folderError }, { data: qrRows, error: qrError }] = await Promise.all([
    sb
      .from("qr_folders")
      .select("id,name,created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .returns<FolderRow[]>(),
    sb
      .from("qr_codes")
      .select("id,title,short_slug,folder_id,qr_type,is_active,scan_count,created_at")
      .eq("user_id", auth.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<QrRow[]>(),
  ]);

  if (folderError) return NextResponse.json({ error: folderError.message }, { status: 400 });
  if (qrError) return NextResponse.json({ error: qrError.message }, { status: 400 });

  let qrs = qrRows ?? [];
  if (folder !== "all") {
    qrs = folder === "uncategorized" ? qrs.filter((qr) => !qr.folder_id) : qrs.filter((qr) => qr.folder_id === folder);
  }
  if (qrId !== "all") {
    qrs = qrs.filter((qr) => qr.id === qrId);
  }

  const qrIds = qrs.map((qr) => qr.id);
  let scans: ScanRow[] = [];
  if (qrIds.length > 0) {
    const { data, error } = await sb
      .from("scan_logs")
      .select("id,qr_id,scanned_at,device,os,country,city,user_agent,ip_hash,fingerprint")
      .in("qr_id", qrIds)
      .gte("scanned_at", since.toISOString())
      .lte("scanned_at", until.toISOString())
      .order("scanned_at", { ascending: false })
      .limit(5000)
      .returns<ScanRow[]>();
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "reports.GET") }, { status: 500 });
    scans = data ?? [];
  }

  const allTimeScanMap = await loadScanCountMap(sb, qrIds).catch(() => new Map<string, number>());
  const totalScansAllTime = qrs.reduce((sum, qr) => sum + (allTimeScanMap.get(qr.id) ?? qr.scan_count ?? 0), 0);

  const qrById = new Map(qrs.map((qr) => [qr.id, qr]));
  const folderById = new Map((folders ?? []).map((item) => [item.id, item]));
  const dailyMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const osMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  const qrScanMap = new Map<string, number>();
  const uniqueKeys = new Set<string>();

  const dayCount = Math.max(1, Math.ceil((until.getTime() - since.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const date = new Date(until.getTime() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }

  scans.forEach((scan) => {
    const day = new Date(scan.scanned_at).toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    inc(countryMap, scan.country);
    inc(cityMap, scan.city);
    inc(deviceMap, scan.device);
    inc(osMap, scan.os);
    inc(browserMap, detectBrowser(scan.user_agent));
    uniqueKeys.add(scan.fingerprint || `${scan.ip_hash || "unknown"}:${scan.user_agent || "unknown"}`);
    qrScanMap.set(scan.qr_id, (qrScanMap.get(scan.qr_id) ?? 0) + 1);
  });

  const topQr = qrs
    .map((qr) => ({
      id: qr.id,
      title: qr.title,
      short_slug: qr.short_slug,
      folder_id: qr.folder_id,
      folder_name: qr.folder_id ? folderById.get(qr.folder_id)?.name ?? null : null,
      scan_count: qrScanMap.get(qr.id) ?? 0,
      total_scan_count: allTimeScanMap.get(qr.id) ?? qr.scan_count ?? 0,
    }))
    .sort((a, b) => b.scan_count - a.scan_count || b.total_scan_count - a.total_scan_count)
    .slice(0, 12);

  const recentTotal = scans.length;
  const recentScans = scans.slice((page - 1) * limit, page * limit).map((scan) => {
    const qr = qrById.get(scan.qr_id);
    return {
      id: scan.id,
      qr_id: scan.qr_id,
      title: qr?.title ?? "Silinmiş QR",
      short_slug: qr?.short_slug ?? "",
      scanned_at: scan.scanned_at,
      country: scan.country ?? "Bilinmiyor",
      city: scan.city ?? "Bilinmiyor",
      device: scan.device ?? "Bilinmiyor",
      os: scan.os ?? "Bilinmiyor",
      browser: detectBrowser(scan.user_agent),
    };
  });

  const exportFormat = req.nextUrl.searchParams.get("format");
  if (exportFormat === "csv") {
    const rows = reportRows(scans, qrById);
    const header = ["QR Başlığı", "Slug", "Ülke", "Şehir", "Cihaz", "OS", "Tarayıcı", "Tarih"] as const;
    const csv = [header, ...rows.map(row => header.map(key => row[key]))]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    return new NextResponse("﻿" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tarama-raporu-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (exportFormat === "xlsx") {
    const headers = ["QR Başlığı", "Slug", "Ülke", "Şehir", "Cihaz", "OS", "Tarayıcı", "Tarih"] as const;
    const rows = reportRows(scans, qrById);
    const buffer = await writeXlsxFile(
      [headers.map(value => String(value)), ...rows.map(row => headers.map(key => row[key]))],
      { sheet: "Taramalar" },
    ).toBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tarama-raporu-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }

  return NextResponse.json({
    report: {
      filters: { folder, qr: qrId, days, from: since.toISOString().slice(0, 10), to: until.toISOString().slice(0, 10), page, limit },
      totals: {
        qrs: qrs.length,
        active_qrs: qrs.filter((qr) => qr.is_active).length,
        total_scans: totalScansAllTime,
        scans: scans.length,
        unique_scans: uniqueKeys.size,
        countries: countryMap.size,
        cities: cityMap.size,
      },
      folders: folders ?? [],
      qrs,
      daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
      countries: toPairs(countryMap, "country"),
      cities: toPairs(cityMap, "city"),
      devices: toPairs(deviceMap, "device"),
      os: toPairs(osMap, "os"),
      browsers: toPairs(browserMap, "browser"),
      top_qr: topQr,
      recent_scans: recentScans,
      recent_pagination: {
        page,
        limit,
        total: recentTotal,
        total_pages: Math.max(1, Math.ceil(recentTotal / limit)),
      },
    },
  });
}
