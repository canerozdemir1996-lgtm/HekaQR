export type BookingStatus = "new" | "in_progress" | "completed" | "cancelled";

export type BookingConfig = {
  kind: "booking";
  title: string;
  description: string;
  serviceType: string;
  location: string;
  onlineUrl: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  durationMinutes: number;
  capacity: number;
  timezone: string;
  successMessage: string;
  active: boolean;
};

export type DocumentQrConfig = {
  kind: "doc";
  documentTitle: string;
  description: string;
  documentUrl: string;
  accessNotice: string;
  buttonText: string;
  coverImageUrl: string;
  showLanding: boolean;
};

export type AppStoreQrConfig = {
  kind: "appstore";
  appName: string;
  description: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  defaultUrl: string;
  logoUrl: string;
  ctaText: string;
};

export type Gs1QrConfig = {
  kind: "gs1";
  gtin: string;
  batchNumber: string;
  serialNumber: string;
  expiryDate: string; // YYYY-MM-DD
  productName: string;
};

export type SmartQrConfig = BookingConfig | DocumentQrConfig | AppStoreQrConfig | Gs1QrConfig;

export const EMPTY_BOOKING_CONFIG: BookingConfig = {
  kind: "booking",
  title: "Randevu / Rezervasyon",
  description: "Uygun tarih ve saat seçerek rezervasyonunuzu oluşturun.",
  serviceType: "",
  location: "",
  onlineUrl: "",
  dateFrom: "",
  dateTo: "",
  timeFrom: "09:00",
  timeTo: "18:00",
  durationMinutes: 30,
  capacity: 1,
  timezone: "Europe/Istanbul",
  successMessage: "Rezervasyon talebiniz alındı. En kısa sürede bilgilendirileceksiniz.",
  active: true,
};

export const EMPTY_DOCUMENT_QR_CONFIG: DocumentQrConfig = {
  kind: "doc",
  documentTitle: "Doküman",
  description: "Dokümana güvenli şekilde erişmek için aşağıdaki butonu kullanın.",
  documentUrl: "",
  accessNotice: "Doküman erişim yetkisi Google Drive / doküman paylaşım ayarlarına bağlıdır.",
  buttonText: "Dokümanı Aç",
  coverImageUrl: "",
  showLanding: true,
};

export const EMPTY_APP_STORE_QR_CONFIG: AppStoreQrConfig = {
  kind: "appstore",
  appName: "Mobil Uygulama",
  description: "Cihazınıza uygun mağazadan uygulamayı indirin.",
  appStoreUrl: "",
  googlePlayUrl: "",
  defaultUrl: "",
  logoUrl: "",
  ctaText: "Uygulamayı Aç",
};

export const EMPTY_GS1_QR_CONFIG: Gs1QrConfig = {
  kind: "gs1",
  gtin: "",
  batchNumber: "",
  serialNumber: "",
  expiryDate: "",
  productName: "Ürün",
};

function clean(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function positiveNumber(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function normalizeBookingConfig(value: unknown): BookingConfig {
  const input = value && typeof value === "object" ? value as Partial<BookingConfig> : {};
  return {
    kind: "booking",
    title: clean(input.title, EMPTY_BOOKING_CONFIG.title) || EMPTY_BOOKING_CONFIG.title,
    description: clean(input.description, EMPTY_BOOKING_CONFIG.description) || EMPTY_BOOKING_CONFIG.description,
    serviceType: clean(input.serviceType),
    location: clean(input.location),
    onlineUrl: clean(input.onlineUrl),
    dateFrom: clean(input.dateFrom),
    dateTo: clean(input.dateTo),
    timeFrom: clean(input.timeFrom, EMPTY_BOOKING_CONFIG.timeFrom) || EMPTY_BOOKING_CONFIG.timeFrom,
    timeTo: clean(input.timeTo, EMPTY_BOOKING_CONFIG.timeTo) || EMPTY_BOOKING_CONFIG.timeTo,
    durationMinutes: positiveNumber(input.durationMinutes, EMPTY_BOOKING_CONFIG.durationMinutes, 5, 480),
    capacity: positiveNumber(input.capacity, EMPTY_BOOKING_CONFIG.capacity, 1, 1000),
    timezone: clean(input.timezone, EMPTY_BOOKING_CONFIG.timezone) || EMPTY_BOOKING_CONFIG.timezone,
    successMessage: clean(input.successMessage, EMPTY_BOOKING_CONFIG.successMessage) || EMPTY_BOOKING_CONFIG.successMessage,
    active: input.active !== false,
  };
}

export function normalizeDocumentQrConfig(value: unknown): DocumentQrConfig {
  const input = value && typeof value === "object" ? value as Partial<DocumentQrConfig> : {};
  return {
    kind: "doc",
    documentTitle: clean(input.documentTitle, EMPTY_DOCUMENT_QR_CONFIG.documentTitle) || EMPTY_DOCUMENT_QR_CONFIG.documentTitle,
    description: clean(input.description, EMPTY_DOCUMENT_QR_CONFIG.description) || EMPTY_DOCUMENT_QR_CONFIG.description,
    documentUrl: clean(input.documentUrl),
    accessNotice: clean(input.accessNotice, EMPTY_DOCUMENT_QR_CONFIG.accessNotice) || EMPTY_DOCUMENT_QR_CONFIG.accessNotice,
    buttonText: clean(input.buttonText, EMPTY_DOCUMENT_QR_CONFIG.buttonText) || EMPTY_DOCUMENT_QR_CONFIG.buttonText,
    coverImageUrl: clean(input.coverImageUrl),
    showLanding: input.showLanding !== false,
  };
}

export function normalizeAppStoreQrConfig(value: unknown): AppStoreQrConfig {
  const input = value && typeof value === "object" ? value as Partial<AppStoreQrConfig> : {};
  return {
    kind: "appstore",
    appName: clean(input.appName, EMPTY_APP_STORE_QR_CONFIG.appName) || EMPTY_APP_STORE_QR_CONFIG.appName,
    description: clean(input.description, EMPTY_APP_STORE_QR_CONFIG.description) || EMPTY_APP_STORE_QR_CONFIG.description,
    appStoreUrl: clean(input.appStoreUrl),
    googlePlayUrl: clean(input.googlePlayUrl),
    defaultUrl: clean(input.defaultUrl),
    logoUrl: clean(input.logoUrl),
    ctaText: clean(input.ctaText, EMPTY_APP_STORE_QR_CONFIG.ctaText) || EMPTY_APP_STORE_QR_CONFIG.ctaText,
  };
}

function normalizeGtin(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 14);
}

export function normalizeGs1QrConfig(value: unknown): Gs1QrConfig {
  const input = value && typeof value === "object" ? value as Partial<Gs1QrConfig> : {};
  return {
    kind: "gs1",
    gtin: normalizeGtin(input.gtin),
    batchNumber: clean(input.batchNumber),
    serialNumber: clean(input.serialNumber),
    expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(String(input.expiryDate ?? "")) ? String(input.expiryDate) : "",
    productName: clean(input.productName, EMPTY_GS1_QR_CONFIG.productName) || EMPTY_GS1_QR_CONFIG.productName,
  };
}

/** GS1 AI 17 formatı: YYMMDD. Girdi YYYY-MM-DD ISO tarih bekler. */
export function gs1ExpiryToAi17(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return "";
  return `${m[1].slice(2)}${m[2]}${m[3]}`;
}

export function ai17ToIsoExpiry(ai17: string): string {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(ai17);
  if (!m) return "";
  const yy = Number(m[1]);
  const century = yy <= 50 ? "20" : "19"; // GS1 kuralı: 00-50 -> 20xx, 51-99 -> 19xx
  return `${century}${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * GS1 Digital Link URI path'i üretir: /01/{gtin}/10/{lot}/17/{expiry}/21/{seri}
 * AI'lar GS1 spesifikasyonundaki sayısal sıraya göre dizilir (01, 10, 17, 21).
 */
export function buildGs1DigitalLinkPath(config: Pick<Gs1QrConfig, "gtin" | "batchNumber" | "expiryDate" | "serialNumber">): string {
  const gtin = normalizeGtin(config.gtin);
  if (!gtin) return "";

  let path = `/01/${gtin}`;
  if (config.batchNumber.trim()) path += `/10/${encodeURIComponent(config.batchNumber.trim())}`;
  const ai17 = gs1ExpiryToAi17(config.expiryDate);
  if (ai17) path += `/17/${ai17}`;
  if (config.serialNumber.trim()) path += `/21/${encodeURIComponent(config.serialNumber.trim())}`;
  return path;
}
