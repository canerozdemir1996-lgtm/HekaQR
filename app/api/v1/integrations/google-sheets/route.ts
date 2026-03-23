// ─── Google Sheets Integration ─────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Google Sheets'ten CSV import et
 * Şema: title, url, qr_type (opsiyonel), tags (opsiyonel), notes (opsiyonel)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, csvData, sheetName } = await req.json();

    if (!userId || !csvData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sb = sbAdmin();

    // CSV'yi parse et
    const rows = csvData.trim().split("\n");
    const headers = rows[0].split(",").map((h: string) => h.trim().toLowerCase());

    const qrCodes: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i].split(",").map((v: string) => v.trim());
        const row: Record<string, string> = {};

        headers.forEach((header: string, index: number) => {
          row[header] = values[index] || "";
        });

        // Validation
        if (!row.title || !row.url) {
          errors.push(`Row ${i}: Missing title or URL`);
          errorCount++;
          continue;
        }

        // Generate slug
        const slug = generateSlug();

        qrCodes.push({
          user_id: userId,
          title: row.title,
          target_url: row.url,
          short_slug: slug,
          qr_type: row.qr_type || "url",
          tags: row.tags ? row.tags.split("|").map((t: string) => t.trim()) : [],
          notes: row.notes || null,
          is_active: true,
        });

        successCount++;
      } catch (error) {
        errors.push(`Row ${i}: ${error instanceof Error ? error.message : "Unknown error"}`);
        errorCount++;
      }
    }

    if (qrCodes.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found", errors },
        { status: 400 }
      );
    }

    // Bulk insert
    const { data, error } = await sb
      .from("qr_codes")
      .insert(qrCodes)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      errors,
      summary: {
        total: successCount + errorCount,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (error) {
    console.error("Google Sheets import error:", error);
    return NextResponse.json(
      { error: "Import failed", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

function generateSlug(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 7; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Template CSV indir
 */
export async function GET() {
  const csvTemplate = `title,url,qr_type,tags,notes
"Örnek QR 1","https://example.com/product1","url","product|example","İlk örnek"
"Örnek QR 2","https://example.com/product2","url","product|sale","İndirimli ürün"
"Etkinlik","https://forms.google.com/form","url","event|form",""
"Feedback","https://example.com/feedback","url","feedback,survey",""`;

  return new Response(csvTemplate, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="qr_template.csv"',
    },
  });
}
