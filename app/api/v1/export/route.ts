import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

// GET /api/v1/export?format=json|csv — kullanıcının kendi verisini dışa aktarır (KVKK/GDPR "verimi indir")
export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const sb = sbAdmin();

  const { data: qrcodes, error: qrError } = await sb
    .from("qr_codes")
    .select("*")
    .eq("user_id", auth.userId);
  if (qrError) return NextResponse.json({ error: qrError.message }, { status: 400 });

  const qrIds = (qrcodes ?? []).map(row => row.id);
  let scans: Record<string, unknown>[] = [];
  if (qrIds.length > 0) {
    const { data, error: scanError } = await sb
      .from("scan_logs")
      .select("*")
      .in("qr_id", qrIds)
      .limit(50000);
    if (scanError) return NextResponse.json({ error: scanError.message }, { status: 400 });
    scans = data ?? [];
  }

  const { data: settings, error: settingsError } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 });

  if (format === "csv") {
    const csv = toCsv((qrcodes ?? []) as Record<string, unknown>[]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="qr-export-${auth.userId}.csv"`,
      },
    });
  }

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    qrcodes: qrcodes ?? [],
    scans,
    settings: settings ?? null,
  });
}
