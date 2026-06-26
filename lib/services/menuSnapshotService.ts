/**
 * menuSnapshotService — menü QR'larının statik HTML snapshot'ını oluşturur ve saklar.
 *
 * Snapshot'lar menu_snapshots tablosuna yazılır. Ana uygulama çevrimdışıyken
 * /menu/[slug]/fallback rotası bu tabloyu Supabase'den okuyarak minimal HTML sayfası sunar.
 * Nginx seviyesinde proxy varsa Supabase'in public REST API'si ayrıca CDN görevi görür.
 *
 * Çağrı noktaları:
 *  - QR menü kayıt/güncelleme: updateMenuSnapshot(slug) tetiklenir (fire-and-forget)
 *  - Admin "Snapshot Yenile" butonu: generateMenuSnapshot(slug) doğrudan çağrılır
 */

import { sbAdmin } from "@/lib/server/api-helpers";

export interface SnapshotResult {
  ok: boolean;
  error?: string;
  snapshot_at?: string;
}

/** Menü JSON verisinden minimal fallback HTML üretir */
function buildFallbackHtml(slug: string, menu: Record<string, unknown>): string {
  const name = String(menu.restaurantName ?? menu.name ?? slug);
  const subtitle = String(menu.subtitle ?? "");
  const currency = String(menu.currency ?? "₺");
  const categories = Array.isArray(menu.categories) ? menu.categories : [];

  const categoriesHtml = categories
    .map((cat: Record<string, unknown>) => {
      const catName = String(cat.name ?? "");
      const items = Array.isArray(cat.items) ? cat.items : [];
      const itemsHtml = items
        .map((item: Record<string, unknown>) => {
          const itemName = String(item.name ?? "");
          const price = item.price !== undefined ? `${currency}${item.price}` : "";
          const desc = item.description ? `<p class="desc">${String(item.description)}</p>` : "";
          return `<div class="item"><span class="item-name">${itemName}</span>${price ? `<span class="price">${price}</span>` : ""}${desc}</div>`;
        })
        .join("");
      return `<section class="category"><h2>${catName}</h2><div class="items">${itemsHtml}</div></section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} — Menü</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:16px;background:#fafafa;color:#1a1a1a}
  .banner{background:#7c3aed;color:#fff;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center}
  .banner h1{margin:0;font-size:1.4rem}
  .banner p{margin:6px 0 0;font-size:.9rem;opacity:.85}
  .offline-notice{background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;font-size:.85rem;color:#92400e;margin-bottom:20px}
  .category{background:#fff;border-radius:10px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px #0001}
  .category h2{margin:0 0 12px;font-size:1rem;color:#7c3aed;border-bottom:1px solid #ede9fe;padding-bottom:8px}
  .item{display:flex;flex-wrap:wrap;gap:4px;align-items:baseline;padding:8px 0;border-bottom:1px solid #f3f4f6}
  .item:last-child{border:none}
  .item-name{flex:1;font-weight:600;font-size:.95rem}
  .price{font-weight:700;color:#7c3aed;font-size:.95rem}
  .desc{width:100%;font-size:.82rem;color:#6b7280;margin:2px 0 0}
  footer{text-align:center;font-size:.75rem;color:#9ca3af;margin-top:32px}
</style>
</head>
<body>
<div class="banner"><h1>${name}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
<div class="offline-notice">📋 Şu anda <strong>yalnızca menü görüntüleme modu</strong> aktiftir. Sipariş vermek için lütfen personeli çağırın veya daha sonra tekrar deneyin.</div>
${categoriesHtml || "<p style='text-align:center;color:#9ca3af'>Menü içeriği bulunamadı.</p>"}
<footer>Bu sayfa çevrimdışı yedekten sunulmaktadır.</footer>
</body>
</html>`;
}

/**
 * Belirtilen slug için menü snapshot'ı oluşturur.
 * Hata durumunda loglar ve menu_snapshots.error alanını günceller.
 */
export async function generateMenuSnapshot(slug: string): Promise<SnapshotResult> {
  const sb = sbAdmin();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: qrRaw, error: qrErr } = await (sb as any)
      .from("qr_codes")
      .select("id, dynamic_content, data")
      .eq("short_slug", slug.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();
    const qr = qrRaw as { id: string; dynamic_content: unknown; data: unknown } | null;

    if (qrErr || !qr) {
      return { ok: false, error: "QR bulunamadı." };
    }

    // Menü verisi dynamic_content.menu veya data.menu içinde olabilir
    const rawMenu =
      (qr.dynamic_content as Record<string, unknown>)?.menu ??
      (qr.data as Record<string, unknown>)?.menu ??
      qr.dynamic_content ??
      qr.data;

    if (!rawMenu || typeof rawMenu !== "object") {
      return { ok: false, error: "Bu QR için menü verisi bulunamadı." };
    }

    const menu = rawMenu as Record<string, unknown>;
    const html = buildFallbackHtml(slug, menu);
    const snapshot_at = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertErr } = await (sb as any)
      .from("menu_snapshots")
      .upsert(
        {
          qr_id: qr.id,
          slug: slug.toLowerCase(),
          html,
          menu_json: menu,
          snapshot_at,
          error: null,
          updated_at: snapshot_at,
        },
        { onConflict: "qr_id" },
      );

    if (upsertErr) {
      console.error("[menuSnapshot] upsert error:", upsertErr.message);
      return { ok: false, error: upsertErr.message };
    }

    return { ok: true, snapshot_at };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[menuSnapshot] unexpected error:", msg);
    // Hata bilgisini tabloya yaz (admin'in görmesi için)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any)
      .from("menu_snapshots")
      .update({ error: msg.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("slug", slug.toLowerCase())
      .then(() => null, () => null);
    return { ok: false, error: msg };
  }
}

/** Sessiz background görevi — QR güncelleme akışlarında kullanılır (fire-and-forget) */
export function updateMenuSnapshot(slug: string): void {
  generateMenuSnapshot(slug).then((r) => {
    if (!r.ok) console.warn(`[menuSnapshot] arka plan snapshot hatası: slug=${slug} err=${r.error}`);
  }).catch((e) => console.error("[menuSnapshot] uncaught:", e));
}
