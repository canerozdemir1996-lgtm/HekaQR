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

export type SmartQrConfig = BookingConfig | DocumentQrConfig | AppStoreQrConfig;

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
