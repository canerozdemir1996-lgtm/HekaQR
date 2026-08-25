import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { RATE_LIMITS, checkRateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 1_000_000;
const MAX_ROWS = 500;

function generateSlug() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function validHttpUrl(value: string) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`integration:${auth.userId}`, RATE_LIMITS.INTEGRATION.max, RATE_LIMITS.INTEGRATION.windowMs)) return tooManyRequestsResponse();
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CSV_BYTES) return NextResponse.json({ error: "CSV dosyası çok büyük." }, { status: 413 });

  const body = await req.json().catch(() => ({})) as { csvData?: unknown };
  const csvData = typeof body.csvData === "string" ? body.csvData : "";
  if (!csvData || Buffer.byteLength(csvData) > MAX_CSV_BYTES) return NextResponse.json({ error: "Geçerli CSV verisi gerekli." }, { status: 400 });

  const lines = csvData.trim().split(/\r?\n/);
  if (lines.length < 2 || lines.length - 1 > MAX_ROWS) return NextResponse.json({ error: `En fazla ${MAX_ROWS} satır içe aktarılabilir.` }, { status: 400 });
  const headers = lines[0].split(",").map((value: string) => value.trim().toLowerCase());
  const records: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = lines[index].split(",").map((value: string) => value.trim());
    const row = Object.fromEntries(headers.map((header: string, column: number) => [header, values[column] ?? ""]));
    const title = String(row.title ?? "").trim().slice(0, 255);
    const targetUrl = String(row.url ?? "").trim();
    if (!title || !validHttpUrl(targetUrl) || targetUrl.length > 4000) {
      errors.push(`Satır ${index + 1}: başlık veya URL geçersiz.`);
      continue;
    }
    records.push({
      user_id: auth.userId,
      title,
      target_url: targetUrl,
      short_slug: generateSlug(),
      qr_type: "url",
      qr_mode: "dynamic",
      is_dynamic: true,
      tags: String(row.tags ?? "").split("|").map(value => value.trim()).filter(Boolean).slice(0, 10),
      notes: String(row.notes ?? "").trim().slice(0, 500) || null,
      is_active: true,
    });
  }

  if (!records.length) return NextResponse.json({ error: "Geçerli satır bulunamadı.", errors }, { status: 400 });
  const { data, error } = await sbAdmin().from("qr_codes").insert(records).select("id,title,short_slug");
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "integrations.google-sheets.POST", "İçe aktarma tamamlanamadı.") }, { status: 400 });
  return NextResponse.json({ success: true, imported: data?.length ?? 0, errors });
}

export async function GET() {
  const csvTemplate = 'title,url,tags,notes\n"Örnek QR","https://example.com","product|example","Açıklama"';
  return new Response(csvTemplate, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="qr_template.csv"' } });
}
