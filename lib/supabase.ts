import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import type { VCardData } from "@/app/card/[slug]/VCardPageClient";
import type { MenuData } from "@/lib/menu";
import type { MultiLinkData } from "@/lib/multi-link";
import type { FeedbackConfig } from "@/lib/feedback";
import type { SmartQrConfig } from "@/lib/smart-qr";
import { buildGs1DigitalLinkPath } from "@/lib/smart-qr";
import {
  buildEventQrContent,
  buildCouponQrContent,
  buildAudioQrContent,
} from "@/lib/services/qrContentBuilder";
import type { BulkRow } from "@/lib/bulk-import";

export type { BulkRow, BulkRowType } from "@/lib/bulk-import";

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
  | "phone"
  | "feedback"
  | "booking"
  | "doc"
  | "appstore"
  | "event"
  | "location"
  | "coupon"
  | "gs1"
  | "audio"
  | "quiz";

export const QR_TYPE_LABELS: Record<QrType, { label: string; emoji: string; desc: string }> = {
  menu:     { label: "Menü QR",          emoji: "🍽️", desc: "Restoran menüsü, kategori, ürün ve besin değerleri" },
  feedback: { label: "Geri Bildirim",    emoji: "📝", desc: "Lokasyon bazlı şikayet, öneri ve istek formu" },
  booking:  { label: "Rezervasyon",       emoji: "📅", desc: "Randevu, kontenjan ve saat aralığı ile rezervasyon formu" },
  doc:      { label: "Doküman",           emoji: "📄", desc: "Google Docs, Drive veya PDF için markalı doküman landing page" },
  appstore: { label: "App Store",         emoji: "📲", desc: "iOS/Android cihaza göre mağaza yönlendirmesi" },
  url:      { label: "Web Sitesi",      emoji: "🌐", desc: "Herhangi bir URL'e yönlendir" },
  product:  { label: "Ürün QR",         emoji: "🏷️", desc: "SKU ve ürün adı ile yönlendirme" },
  vcard:    { label: "Dijital Kartvizit",emoji: "👤", desc: "Özelleştirilebilir landing page + rehbere kaydet" },
  multi:    { label: "Multi URL",       emoji: "🔗", desc: "Profil, linkler ve iletişim bloklarıyla mini landing page" },
  wifi:     { label: "WiFi",            emoji: "📶", desc: "Şifresiz bağlantı paylaş" },
  sms:      { label: "SMS",             emoji: "💬", desc: "Hazır SMS mesajı" },
  email:    { label: "E-posta",         emoji: "✉️", desc: "E-posta taslağı oluştur" },
  whatsapp: { label: "WhatsApp",        emoji: "📱", desc: "WhatsApp sohbeti başlat" },
  text:     { label: "Düz Metin",       emoji: "📝", desc: "Metin veya not içeriği" },
  phone:    { label: "Telefon",         emoji: "📞", desc: "Tek dokunuşla ara" },
  event:    { label: "Etkinlik",        emoji: "📅", desc: "Takvime eklenebilir etkinlik (tarih, yer, açıklama)" },
  location: { label: "Konum",           emoji: "📍", desc: "Haritada bir adresi veya yeri göster" },
  coupon:   { label: "Kupon",           emoji: "🎟️", desc: "İndirim kodu ve geçerlilik tarihiyle kupon" },
  gs1:      { label: "Ürün Barkodu",    emoji: "🏷️", desc: "GS1/GTIN barkod formatında ürün kodu" },
  audio:    { label: "Ses/MP3",         emoji: "🎵", desc: "Ses dosyası bağlantılarından oynatma listesi" },
  quiz:     { label: "Online Sınav",    emoji: "✅", desc: "Soru, süre, puanlama ve sonuç ekranı olan sınav modülü" },
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
  qr_mode?:       "static" | "dynamic";
  static_payload?: string | null;
  is_active:      boolean;
  scan_count:     number;
  style_id:       string | null;
  organization_id?: string | null;
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
  dynamic_content?: MenuData | MultiLinkData | FeedbackConfig | SmartQrConfig | Record<string, unknown> | null;
  is_dynamic?:     boolean | null;
  folder_id?:     string | null;
  rules?:         Record<string, unknown> | null;
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  webhook_url?:   string | null;
  qr_design?:     Record<string, unknown> | null;
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
  current_plan?: string | null;
  billing_cycle?: string | null;
  subscription_status?: string | null;
  plan_expires_at?: string | null;
  license_key?: string | null;
  license_type?: string | null;
  license_plan?: string | null;
  license_issued_at?: string | null;
  license_issued_by?: string | null;
  billing_name?: string | null;
  company_name?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
  invoice_email?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_country?: string | null;
  payment_method_label?: string | null;
  notification_email?: string | null;
  security_contact_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  my_role: "owner" | "admin" | "editor" | "viewer" | string;
  member_count?: number;
}

export interface QrStyle {
  id: string;
  name: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  user_id?: string | null;
  category?: string;
  visibility?: "system" | "public" | "private";
  description?: string | null;
  preview_url?: string | null;
  collection_id?: string | null;
}
export interface QrTemplateCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string;
  qr_styles?: Array<{ count: number }>;
}
export interface ScanLog {
  id: number; qr_id: string; scanned_at: string; device: string | null; os: string | null;
  user_agent?: string | null; country?: string | null; city?: string | null;
}
export interface DailyStats  { date: string;   scans: number; }
export interface DeviceStats { device: string; count: number; }

// ─── Supabase Client (Singleton) ─────────────────────────────────────────────
// Tek instance — birden fazla GoTrueClient oluşmasını önler
// Session cookie'lerde tutuluyor (createBrowserClient) — bu yüzden Route
// Handler/middleware/Server Component tarafı (bkz. lib/supabase-server.ts,
// lib/supabase-middleware.ts) aynı oturumu request cookie'lerinden okuyabiliyor.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env değişkenleri eksik. .env.local dosyasını kontrol edin.");
  }

  if (typeof window === "undefined") {
    // SSR - her request için yeni instance, oturumsuz (anon) - public sayfalar için
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  if (!_client) {
    _client = createBrowserClient(url, key);
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
    cache: init.cache ?? "no-store",
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = typeof json?.error === "string" ? json.error : "QR işlemi tamamlanamadı.";
    if (message === "Validation failed" && json?.details && typeof json.details === "object") {
      const fieldErrors = Object.entries(json.details as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
      if (fieldErrors) message = `Doğrulama hatası — ${fieldErrors}`;
    }
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
    case "quiz":     return data.url || "";
    case "wifi": {
      const esc = (v: string) =>
        String(v ?? "")
          .replace(/\\/g, "\\\\")
          .replace(/;/g, "\\;")
          .replace(/,/g, "\\,")
          .replace(/:/g, "\\:");
      return `WIFI:T:${esc(data.security || "WPA")};S:${esc(data.ssid)};P:${esc(data.password)};;`;
    }
    case "sms":      return `sms:${(data.phone || "").replace(/\s/g, "")}?body=${encodeURIComponent(data.message || "")}`;
    case "email":    return `mailto:${data.email}?subject=${encodeURIComponent(data.subject || "")}&body=${encodeURIComponent(data.body || "")}`;
    case "whatsapp": return `https://wa.me/${(data.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(data.message || "")}`;
    case "text":     return data.text || "";
    case "phone":    return `tel:${(data.phone || "").replace(/\s/g, "")}`;
    case "event":
      return buildEventQrContent({
        title: data.title || "",
        description: data.description || undefined,
        startDate: data.startDate || "",
        endDate: data.endDate || undefined,
        location: data.location || undefined,
      });
    case "location":
      return `https://maps.google.com?q=${encodeURIComponent(data.place || "")}`;
    case "coupon":
      return buildCouponQrContent({
        code: data.code || "",
        discount: data.discount || "",
        validUntil: data.validUntil || undefined,
        description: data.description || undefined,
      });
    case "gs1":
      // GS1 Digital Link URI path'i (origin caller tarafından eklenir) —
      // hem normal telefon kamerasıyla açılabilir hem GS1-uyumlu okuyucularla
      // GTIN/lot/SKT/seri olarak ayrıştırılabilir (2027 Sunrise standardı).
      return buildGs1DigitalLinkPath({
        gtin: data.gtin || "",
        batchNumber: data.batchNumber || "",
        expiryDate: data.expiryDate || "",
        serialNumber: data.serialNumber || "",
      });
    case "audio":
      return buildAudioQrContent((data.urls || "").split("\n").map((u) => u.trim()).filter(Boolean));
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
  qr_mode?:       "static" | "dynamic";
  static_payload?: string | null;
  password?:      string | null;
  scan_limit?:    number | null;
  expires_at?:    string | null;
  pixel_id?:      string | null;
  pixel_enabled?: boolean;
  is_active?:     boolean;
  style_id?:      string | null;
  template_id?:   string | null;
  organization_id?: string | null;
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
  dynamic_content?: MenuData | MultiLinkData | FeedbackConfig | SmartQrConfig | Record<string, unknown> | null;
  is_dynamic?:     boolean;
  folder_id?:     string | null;
  rules?:         Record<string, unknown> | null;
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  webhook_url?:   string | null;
  qr_design?:     Record<string, unknown> | null;
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

export async function createQrCode(payload: QrPayload, options?: { bulk?: boolean }): Promise<QrCode> {
  const data = await qrApi<{ qrcode: QrCode }>("/api/v1/qrcodes", {
    method: "POST",
    headers: options?.bulk ? { "x-heka-bulk-create": "1" } : undefined,
    body: JSON.stringify(payload),
  });
  return data.qrcode;
}

export async function updateQrCode(id: string, payload: Partial<QrPayload>): Promise<QrCode> {
  // short_slug is immutable — strip it so we never accidentally send it
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
export interface BulkResult {
  success: number;
  failed: { row: number; title: string; error: string }[];
  created: QrCode[];
  importBatchId?: string;
}

export interface BulkImportOptions {
  styleId?: string | null;
  folderId?: string | null;
  organizationId?: string | null;
  sourceFileName?: string | null;
  sourceFormat?: "csv" | "xlsx";
  idempotencyKey?: string;
}

export interface BulkImportBatch {
  id: string;
  name: string;
  status: "ready" | "processing" | "partial" | "completed" | "failed" | "cancelled";
  total_rows: number;
  created_rows: number;
  failed_rows: number;
  skipped_rows: number;
  created_at: string;
  updated_at: string;
}

export async function fetchBulkImports(limit = 20): Promise<BulkImportBatch[]> {
  const data = await qrApi<{ imports: BulkImportBatch[] }>(`/api/v1/imports?limit=${Math.min(Math.max(limit, 1), 50)}`);
  return data.imports ?? [];
}

type BulkProcessResponse = {
  remaining: number;
  processed: { row: number; status: "created" | "failed"; qr_code_id?: string; error?: string }[];
};

export async function retryBulkImport(batchId: string): Promise<BulkResult> {
  const retryRunId = crypto.randomUUID();
  const result: BulkResult = { success: 0, failed: [], created: [], importBatchId: batchId };
  let remaining = 1;
  let attempts = 0;

  while (remaining > 0 && attempts < 250) {
    attempts += 1;
    const response = await qrApi<BulkProcessResponse>(`/api/v1/imports/${batchId}/process`, {
      method: "POST",
      body: JSON.stringify({ limit: 25, retry_failed: true, retry_run_id: retryRunId }),
    });
    remaining = response.remaining;
    for (const processed of response.processed) {
      if (processed.status === "created") result.success += 1;
      else result.failed.push({ row: processed.row, title: `Satır ${processed.row}`, error: processed.error ?? "QR oluşturulamadı." });
    }
    if (response.processed.length === 0 && remaining > 0) {
      throw new Error("Retry akışı ilerleyemedi. İşlenen başka bir worker varsa kısa süre sonra tekrar deneyin.");
    }
  }
  if (remaining > 0) throw new Error("Retry güvenlik döngüsü sınırına ulaştı.");
  return result;
}

export async function bulkCreateQrCodes(rows: BulkRow[], options: BulkImportOptions = {}): Promise<BulkResult> {
  const idempotencyKey = options.idempotencyKey ?? crypto.randomUUID();
  const sourceFileName = options.sourceFileName?.trim() || null;
  const name = sourceFileName?.replace(/\.[^.]+$/, "") || `Toplu QR ${new Date().toLocaleDateString("tr-TR")}`;
  const registered = await qrApi<{ import: BulkImportBatch; idempotent_replay: boolean }>("/api/v1/imports", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      name,
      source_file_name: sourceFileName,
      source_format: options.sourceFormat ?? "csv",
      qr_mode: "dynamic",
      folder_id: options.folderId ?? null,
      organization_id: options.organizationId ?? null,
      style_id: options.styleId ?? null,
      rows,
    }),
  });

  const result: BulkResult = {
    success: registered.idempotent_replay ? registered.import.created_rows : 0,
    failed: registered.idempotent_replay && registered.import.failed_rows > 0
      ? [{ row: 0, title: "Önceki deneme", error: `${registered.import.failed_rows} satır önceki denemede başarısız oldu.` }]
      : [],
    created: [],
    importBatchId: registered.import.id,
  };
  const titleByRow = new Map(rows.map((row, index) => [row.source_row ?? index + 2, row.title]));
  let remaining = Math.max(
    0,
    registered.import.total_rows
      - registered.import.created_rows
      - registered.import.failed_rows
      - registered.import.skipped_rows,
  );
  let attempts = 0;

  while (remaining > 0 && attempts < 250) {
    attempts += 1;
    const response = await qrApi<BulkProcessResponse>(`/api/v1/imports/${registered.import.id}/process`, {
      method: "POST",
      body: JSON.stringify({ limit: 25, retry_failed: false }),
    });
    remaining = response.remaining;
    for (const processed of response.processed) {
      if (processed.status === "created") {
        result.success += 1;
      } else {
        result.failed.push({
          row: processed.row,
          title: titleByRow.get(processed.row) ?? "Bilinmeyen satır",
          error: processed.error ?? "QR oluşturulamadı.",
        });
      }
    }
    if (response.processed.length === 0 && remaining > 0) {
      throw new Error("İçe aktarma ilerleyemedi. Birkaç dakika sonra geçmiş ekranından tekrar deneyin.");
    }
  }
  if (remaining > 0) throw new Error("İçe aktarma güvenlik döngüsü sınırına ulaştı.");
  return result;
}

// ─── Stiller ─────────────────────────────────────────────────────────────────
export async function fetchStyles(): Promise<QrStyle[]> {
  const data = await qrApi<{ styles: QrStyle[] }>("/api/v1/styles");
  return data.styles ?? [];
}

export async function saveStyle(name: string, config: Record<string, unknown>, existingId?: string, meta?: { category?: string; collection_id?: string | null; description?: string }): Promise<QrStyle> {
  if (existingId) {
    const data = await qrApi<{ style: QrStyle }>(`/api/v1/styles/${existingId}`, {
      method: "PUT",
      body: JSON.stringify({ name, config, ...meta }),
    });
    return data.style;
  }
  const data = await qrApi<{ style: QrStyle }>("/api/v1/styles", {
    method: "POST",
    body: JSON.stringify({ name, config, ...meta }),
  });
  return data.style;
}

export async function deleteStyle(id: string): Promise<void> {
  await qrApi<{ success: boolean }>(`/api/v1/styles/${id}`, { method: "DELETE" });
}

export async function fetchStyleCollections(): Promise<QrTemplateCollection[]> {
  const data = await qrApi<{ collections: QrTemplateCollection[] }>("/api/v1/style-collections");
  return data.collections ?? [];
}

export async function createStyleCollection(name: string, description?: string): Promise<QrTemplateCollection> {
  const data = await qrApi<{ collection: QrTemplateCollection }>("/api/v1/style-collections", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
  return data.collection;
}

export async function deleteStyleCollection(id: string): Promise<void> {
  await qrApi<{ success: boolean }>(`/api/v1/style-collections/${id}`, { method: "DELETE" });
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

export async function fetchOrganizations(): Promise<OrganizationSummary[]> {
  const data = await qrApi<{ organizations: OrganizationSummary[] }>("/api/v1/organizations");
  return data.organizations ?? [];
}

// ─── Settings ─────────────────────────────────────────────────────────────────
let settingsPromise: Promise<UserSettings> | null = null;

export async function getOrCreateSettings(): Promise<UserSettings> {
  if (!settingsPromise) {
    settingsPromise = qrApi<{ settings: UserSettings }>("/api/v1/settings")
      .then((data) => data.settings)
      .catch((error) => {
        settingsPromise = null;
        throw error;
      });
  }
  return settingsPromise;
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const data = await qrApi<{ settings: UserSettings }>("/api/v1/settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  settingsPromise = Promise.resolve(data.settings);
  return data.settings;
}

export type DashboardPlanInfo = {
  plan: string;
  plan_label: string;
  entitlement_plan: string;
  entitlement_plan_label: string;
  license_key: string | null;
  license_plan: string | null;
  license_type: string | null;
  status: string;
  status_label: string;
  expires_at: string | null;
  days_left: number | null;
  grace_days_left: number | null;
  limits: { max_qr: number };
  usage: { qr_count: number; qr_limit: number; qr_pct: number };
  can_create_qr: boolean;
  at_qr_limit: boolean;
  [key: string]: unknown;
};

let planInfoPromise: Promise<DashboardPlanInfo | null> | null = null;

export async function fetchDashboardPlanInfo(options: { force?: boolean } = {}): Promise<DashboardPlanInfo | null> {
  if (options.force) planInfoPromise = null;
  if (!planInfoPromise) {
    planInfoPromise = fetch("/api/v1/plan", {
      credentials: "same-origin",
      cache: options.force ? "no-store" : "default",
    })
      .then((response) => response.json())
      .then((payload) => (payload && !payload.error ? (payload as DashboardPlanInfo) : null))
      .catch((error) => {
        planInfoPromise = null;
        throw error;
      });
  }
  return planInfoPromise;
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
