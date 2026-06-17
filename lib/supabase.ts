import { createClient } from "@supabase/supabase-js";
import type { VCardData } from "@/app/card/[slug]/VCardPageClient";
import type { MenuData } from "@/lib/menu";
import type { MultiLinkData } from "@/lib/multi-link";

// ─── QR Tipleri ──────────────────────────────────────────────────────────────
export type QrType =
  | "url"
  | "product"
  | "vcard"
  | "multi"
  | "wifi"
  | "sms"
  | "email"
  | "whatsapp"
  | "text"
  | "menu"
  | "phone";

export const QR_TYPE_LABELS: Record<QrType, { label: string; emoji: string; desc: string }> = {
  menu:     { label: "Menü QR",          emoji: "🍽️", desc: "Restoran menüsü, kategori, ürün ve besin değerleri" },
  url:      { label: "Web Sitesi",      emoji: "🌐", desc: "Herhangi bir URL'e yönlendir" },
  product:  { label: "Ürün QR",         emoji: "🏷️", desc: "SKU ve ürün adı ile yönlendirme" },
  vcard:    { label: "Dijital Kartvizit",emoji: "👤", desc: "Özelleştirilebilir landing page + rehbere kaydet" },
  multi:    { label: "Multi URL",       emoji: "🔗", desc: "Profil, linkler ve iletisim bloklariyla mini landing page" },
  wifi:     { label: "WiFi",            emoji: "📶", desc: "Şifresiz bağlantı paylaş" },
  sms:      { label: "SMS",             emoji: "💬", desc: "Hazır SMS mesajı" },
  email:    { label: "E-posta",         emoji: "✉️", desc: "E-posta taslağı oluştur" },
  whatsapp: { label: "WhatsApp",        emoji: "📱", desc: "WhatsApp sohbeti başlat" },
  text:     { label: "Düz Metin",       emoji: "📝", desc: "Metin veya not içeriği" },
  phone:    { label: "Telefon",         emoji: "📞", desc: "Tek dokunuşla ara" },
};

// ─── QrCode Arayüzü ──────────────────────────────────────────────────────────
export interface QrCode {
  id:             string;
  created_at:     string;
  updated_at?:    string | null;
  user_id?:       string | null;
  title:          string;
  short_slug:     string;
  target_url:     string;
  qr_type?:       QrType | null;
  is_active:      boolean;
  scan_count:     number;
  style_id:       string | null;
  pixel_id:       string | null;
  pixel_enabled:  boolean;
  password:       string | null;
  scan_limit:     number | null;
  expires_at:     string | null;
  utm_source?:    string | null;
  utm_medium?:    string | null;
  utm_campaign?:  string | null;
  utm_term?:      string | null;
  utm_content?:   string | null;
  redirect_type?: "301" | "302" | null;
  ab_test_url?:   string | null;
  ab_test_weight?: number | null;
  tags?:          string[];
  notes?:         string | null;
  vcard_data?:    VCardData | null;   // ← vCard için landing page verisi
  dynamic_content?: MenuData | MultiLinkData | Record<string, unknown> | null;
  is_dynamic?:     boolean | null;
  folder_id?:     string | null;
  rules?:         Record<string, unknown> | null;
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  webhook_url?:   string | null;
}

export interface QrFolder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  custom_domain?: string | null;
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  webhook_url?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrStyle {
  id: string; name: string; config: Record<string, unknown>; created_at: string;
}
export interface ScanLog {
  id: number; qr_id: string; scanned_at: string; device: string | null; os: string | null;
  user_agent?: string | null; country?: string | null; city?: string | null;
}
export interface DailyStats  { date: string;   scans: number; }
export interface DeviceStats { device: string; count: number; }

// ─── Supabase Client (Singleton) ─────────────────────────────────────────────
// Tek instance — birden fazla GoTrueClient oluşmasını önler
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env değişkenleri eksik. .env.local dosyasını kontrol edin.");
  }

  if (typeof window === "undefined") {
    // SSR - her request için yeni instance
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  if (!_client) {
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        storageKey: "qrhub-auth",
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function qrApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : "QR işlemi tamamlanamadı.";
    throw new Error(message);
  }
  return json as T;
}

// ─── QR İçerik URL Oluşturucu ────────────────────────────────────────────────
export function buildTargetUrl(type: QrType, data: Record<string, string>): string {
  switch (type) {
    case "url":      return data.url || "";
    case "product":  return data.url || "";
    case "multi":    return data.url || "";
    case "wifi": {
      const esc = (v: string) =>
        String(v ?? "")
          .replace(/\\/g, "\\\\")
          .replace(/;/g, "\\;")
          .replace(/,/g, "\\,")
          .replace(/:/g, "\\:");
      return `WIFI:T:${esc(data.security || "WPA")};S:${esc(data.ssid)};P:${esc(data.password)};;`;
    }
    case "sms":      return `sms:${data.phone}?body=${encodeURIComponent(data.message || "")}`;
    case "email":    return `mailto:${data.email}?subject=${encodeURIComponent(data.subject || "")}&body=${encodeURIComponent(data.body || "")}`;
    case "whatsapp": return `https://wa.me/${(data.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(data.message || "")}`;
    case "text":     return data.text || "";
    case "phone":    return `tel:${data.phone}`;
    // vcard: target_url = /card/{slug} (otomatik kurulur, buraya gelmiyor)
    default:         return data.url || "";
  }
}

// ─── QrPayload ───────────────────────────────────────────────────────────────
export interface QrPayload {
  title:          string;
  user_id?:       string | null;
  short_slug:     string;
  target_url:     string;
  qr_type?:       QrType | null;
  password?:      string | null;
  scan_limit?:    number | null;
  expires_at?:    string | null;
  pixel_id?:      string | null;
  pixel_enabled?: boolean;
  is_active?:     boolean;
  style_id?:      string | null;
  utm_source?:    string | null;
  utm_medium?:    string | null;
  utm_campaign?:  string | null;
  utm_term?:      string | null;
  utm_content?:   string | null;
  tags?:          string[];
  notes?:         string | null;
  redirect_type?: "301" | "302" | null;
  ab_test_url?:   string | null;
  ab_test_weight?: number | null;
  vcard_data?:    VCardData | null;
  dynamic_content?: MenuData | MultiLinkData | Record<string, unknown> | null;
  is_dynamic?:     boolean;
  folder_id?:     string | null;
  rules?:         Record<string, unknown> | null;
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  webhook_url?:   string | null;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────
export async function fetchQrCodes(): Promise<QrCode[]> {
  const data = await qrApi<{ qrcodes: QrCode[] }>("/api/v1/qrcodes");
  return data.qrcodes ?? [];
}

export async function fetchQrCode(id: string): Promise<QrCode> {
  const data = await qrApi<{ qrcode: QrCode }>(`/api/v1/qrcodes/${id}`);
  return data.qrcode;
}

export async function createQrCode(payload: QrPayload): Promise<QrCode> {
  const data = await qrApi<{ qrcode: QrCode }>("/api/v1/qrcodes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.qrcode;
}

export async function updateQrCode(id: string, payload: Partial<QrPayload>): Promise<QrCode> {
  // short_slug is immutable — strip it so we never accidentally send it
  // eslint-disable-next-line
  const { short_slug: _slug, ...safe } = payload as QrPayload;

  // Always include updated_at so dashboard knows it changed
  const updatePayload = {
    ...safe,
    updated_at: new Date().toISOString(),
  };

  const data = await qrApi<{ qrcode: QrCode }>(`/api/v1/qrcodes/${id}`, {
    method: "PUT",
    body: JSON.stringify(updatePayload),
  });
  return data.qrcode;
}

export async function deleteQrCode(id: string): Promise<void> {
  await qrApi<{ success: boolean }>(`/api/v1/qrcodes/${id}`, { method: "DELETE" });
}

export async function bulkDeleteQrCodes(ids: string[]): Promise<void> {
  const { error } = await getSupabase().from("qr_codes").delete().in("id", ids);
  if (error) throw new Error(error.message);
}

export async function toggleActive(id: string, is_active: boolean): Promise<void> {
  await updateQrCode(id, { is_active });
}

// ─── Toplu oluşturma ─────────────────────────────────────────────────────────
export interface BulkRow   { title: string; target_url: string; is_active?: boolean; }
export interface BulkResult {
  success: number;
  failed: { row: number; title: string; error: string }[];
  created: QrCode[];
}

export async function bulkCreateQrCodes(rows: BulkRow[], styleId?: string | null): Promise<BulkResult> {
  const result: BulkResult = { success: 0, failed: [], created: [] };
  const existing = await fetchQrCodes().catch(() => []);
  const slugSet = new Set(existing.map(r => r.short_slug.toLowerCase()));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let base = row.title.toLowerCase()
      .replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s")
      .replace(/ı/g,"i").replace(/ö/g,"o").replace(/ç/g,"c")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,20) || "qr";
    let slug = base;
    while (slugSet.has(slug)) slug = `${base}-${Math.random().toString(36).slice(2,5)}`;
    slugSet.add(slug);
    try {
      const data = await createQrCode({
        title: row.title, target_url: row.target_url, short_slug: slug,
        style_id: styleId ?? null, is_active: row.is_active ?? true,
        pixel_enabled: false, qr_type: "url", is_dynamic: true,
      });
      result.success++;
      result.created.push(data);
    } catch (err) {
      result.failed.push({ row: i+1, title: row.title, error: err instanceof Error ? err.message : "Hata" });
    }
  }
  return result;
}

// ─── Stiller ─────────────────────────────────────────────────────────────────
export async function fetchStyles(): Promise<QrStyle[]> {
  const data = await qrApi<{ styles: QrStyle[] }>("/api/v1/styles");
  return data.styles ?? [];
}

export async function saveStyle(name: string, config: Record<string, unknown>, existingId?: string): Promise<QrStyle> {
  if (existingId) {
    const data = await qrApi<{ style: QrStyle }>(`/api/v1/styles/${existingId}`, {
      method: "PUT",
      body: JSON.stringify({ name, config }),
    });
    return data.style;
  }
  const data = await qrApi<{ style: QrStyle }>("/api/v1/styles", {
    method: "POST",
    body: JSON.stringify({ name, config }),
  });
  return data.style;
}

export async function deleteStyle(id: string): Promise<void> {
  await qrApi<{ success: boolean }>(`/api/v1/styles/${id}`, { method: "DELETE" });
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const data = await qrApi<{ stats: { total_qr: number; active_qr: number; total_scans: number; scans_today: number } }>("/api/v1/stats");
  return data.stats;
}

export async function fetchDailyStats(qrId: string, days = 30): Promise<DailyStats[]> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await getSupabase()
    .from("scan_logs").select("scanned_at")
    .eq("qr_id", qrId).gte("scanned_at", since.toISOString());
  const map: Record<string,number> = {};
  (data ?? []).forEach((r: { scanned_at: string }) => {
    const d = r.scanned_at.slice(0,10); map[d] = (map[d] ?? 0) + 1;
  });
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days-1-i));
    const k = d.toISOString().slice(0,10);
    return { date: k, scans: map[k] ?? 0 };
  });
}

export async function fetchDeviceStats(qrId: string): Promise<DeviceStats[]> {
  const { data } = await getSupabase()
    .from("scan_logs").select("device").eq("qr_id", qrId);
  const map: Record<string,number> = {};
  (data ?? []).forEach((r: { device: string | null }) => {
    const d = r.device ?? "Unknown"; map[d] = (map[d] ?? 0) + 1;
  });
  return Object.entries(map).map(([device, count]) => ({ device, count }));
}

export async function fetchRecentScans(qrId: string, limit = 20): Promise<ScanLog[]> {
  const { data } = await getSupabase()
    .from("scan_logs").select("*")
    .eq("qr_id", qrId).order("scanned_at", { ascending: false }).limit(limit);
  return (data ?? []) as ScanLog[];
}

// ─── Folders ──────────────────────────────────────────────────────────────────
export async function fetchFolders(): Promise<QrFolder[]> {
  const data = await qrApi<{ folders: QrFolder[] }>("/api/v1/folders");
  return data.folders ?? [];
}

export async function createFolder(name: string): Promise<QrFolder> {
  const data = await qrApi<{ folder: QrFolder }>("/api/v1/folders", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data.folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await qrApi<{ success: boolean }>(`/api/v1/folders/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  await qrApi<{ success: boolean }>(`/api/v1/folders/${id}`, { method: "DELETE" });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getOrCreateSettings(): Promise<UserSettings> {
  const data = await qrApi<{ settings: UserSettings }>("/api/v1/settings");
  return data.settings;
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const data = await qrApi<{ settings: UserSettings }>("/api/v1/settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return data.settings;
}

// ─── Unique scans (client-side) ───────────────────────────────────────────────
export async function fetchUniqueScanCount(qrId: string, days = 30): Promise<number> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data, error } = await getSupabase()
    .from("scan_logs")
    .select("fingerprint")
    .eq("qr_id", qrId)
    .gte("scanned_at", since.toISOString());
  if (error) throw new Error(error.message);
  const set = new Set((data ?? []).map((r: { fingerprint: string | null }) => r.fingerprint).filter(Boolean) as string[]);
  return set.size;
}
