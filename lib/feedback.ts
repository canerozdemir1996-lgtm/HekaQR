export type FeedbackKind = "complaint" | "suggestion" | "request" | "thanks";
export type FeedbackPriority = "low" | "normal" | "high" | "urgent";
export type FeedbackStatus = "new" | "in_progress" | "completed" | "cancelled";

export type FeedbackLocation = {
  campus?: string;
  building?: string;
  floor?: string;
  unit?: string;
  room?: string;
  asset?: string;
};

export type FeedbackRequiredFields = {
  type: boolean;
  subject: boolean;
  message: boolean;
  contact: boolean;
};

export type FeedbackConfig = {
  kind?: "feedback";
  formTitle: string;
  description: string;
  organizationName?: string;
  locationLabel: string;
  location: FeedbackLocation;
  categories: FeedbackKind[];
  priorities: FeedbackPriority[];
  subjects: string[];
  tags: string[];
  formActive: boolean;
  requiredFields: FeedbackRequiredFields;
  maxSelections: number;
  positiveFeedbackEnabled: boolean;
  positiveFeedbackLabel: string;
  allowContact: boolean;
  requireContact: boolean;
  submitButtonText: string;
  resetButtonText: string;
  privacyNotice: string;
  successMessage: string;
};

export type FeedbackSubmission = {
  id: string;
  qr_id: string;
  user_id: string;
  type?: FeedbackKind | null;
  kind: FeedbackKind;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  subject?: string | null;
  tags?: string[] | null;
  message: string;
  admin_note?: string | null;
  completed_at?: string | null;
  device_id?: string | null;
  location_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  location_label?: string | null;
  location_data?: FeedbackLocation | null;
  qr_title?: string | null;
  qr_slug?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  complaint: "Şikayet",
  suggestion: "Öneri",
  request: "İstek",
  thanks: "Teşekkür",
};

export const FEEDBACK_PRIORITY_LABEL: Record<FeedbackPriority, string> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "Yeni",
  in_progress: "İnceleniyor",
  completed: "Tamamlandı",
  cancelled: "İptal / Geçersiz",
};

export const FEEDBACK_DEFAULT_SUBJECTS = [
  "Temizlik",
  "Bakım",
  "Arıza",
  "Güvenlik",
  "Personel",
  "Yönlendirme",
  "Bekleme süresi",
  "Diğer",
];

export const EMPTY_FEEDBACK_CONFIG: FeedbackConfig = {
  kind: "feedback",
  formTitle: "Şikayet, Öneri ve İstek Formu",
  description: "Bulunduğunuz lokasyonla ilgili şikayet, öneri veya isteğinizi iletin. Bildirim ilgili ekibe otomatik yönlendirilir.",
  organizationName: "",
  locationLabel: "",
  location: {
    campus: "",
    building: "",
    floor: "",
    unit: "",
    room: "",
    asset: "",
  },
  categories: ["complaint", "suggestion", "request"],
  priorities: ["normal", "high", "urgent"],
  subjects: FEEDBACK_DEFAULT_SUBJECTS,
  tags: [],
  formActive: true,
  requiredFields: {
    type: true,
    subject: true,
    message: true,
    contact: false,
  },
  maxSelections: 3,
  positiveFeedbackEnabled: true,
  positiveFeedbackLabel: "Pozitif geri bildirim bırakmak istiyorum.",
  allowContact: true,
  requireContact: false,
  submitButtonText: "Bildirimi Gönder",
  resetButtonText: "Temizle",
  privacyNotice: "Lütfen kişisel veri, sağlık bilgisi veya hassas bilgi paylaşmayın. Bu alan yalnızca durum açıklaması içindir.",
  successMessage: "Bildiriminiz alındı. Ekibimiz en kısa sürede inceleyecek.",
};

const KIND_VALUES = ["complaint", "suggestion", "request", "thanks"];
const PRIORITY_VALUES = ["low", "normal", "high", "urgent"];
const STATUS_ALIASES: Record<string, FeedbackStatus> = {
  new: "new",
  reviewing: "in_progress",
  in_progress: "in_progress",
  resolved: "completed",
  closed: "completed",
  completed: "completed",
  cancelled: "cancelled",
};

export function normalizeFeedbackStatus(value: unknown): FeedbackStatus {
  return STATUS_ALIASES[String(value ?? "")] ?? "new";
}

export function buildLocationLabel(location: FeedbackLocation) {
  return [location.campus, location.building, location.floor, location.unit, location.room, location.asset]
    .map(part => String(part ?? "").trim())
    .filter(Boolean)
    .join(" - ");
}

function cleanList(value: unknown, fallback: string[]) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/g) : [];
  const seen = new Set<string>();
  const list = raw
    .map(item => String(item ?? "").trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
  return list.length ? list : fallback;
}

function normalizeRequiredFields(input: Partial<FeedbackConfig>): FeedbackRequiredFields {
  const required = input.requiredFields && typeof input.requiredFields === "object"
    ? input.requiredFields as Partial<FeedbackRequiredFields>
    : {};
  const requireContact = input.requireContact === true;
  return {
    type: required.type !== false,
    subject: required.subject !== false,
    message: required.message !== false,
    contact: required.contact === true || requireContact,
  };
}

export function normalizeFeedbackConfig(value: unknown): FeedbackConfig {
  const input = value && typeof value === "object" ? value as Partial<FeedbackConfig> : {};
  const location = input.location && typeof input.location === "object" ? input.location : {};
  const categories = Array.isArray(input.categories) && input.categories.length
    ? input.categories.filter((item): item is FeedbackKind => KIND_VALUES.includes(String(item)))
    : EMPTY_FEEDBACK_CONFIG.categories;
  const priorities = Array.isArray(input.priorities) && input.priorities.length
    ? input.priorities.filter((item): item is FeedbackPriority => PRIORITY_VALUES.includes(String(item)))
    : EMPTY_FEEDBACK_CONFIG.priorities;
  const nextLocation: FeedbackLocation = {
    campus: String(location.campus ?? ""),
    building: String(location.building ?? ""),
    floor: String(location.floor ?? ""),
    unit: String(location.unit ?? ""),
    room: String(location.room ?? ""),
    asset: String(location.asset ?? ""),
  };
  const maxSelections = Number(input.maxSelections ?? EMPTY_FEEDBACK_CONFIG.maxSelections);
  const allowContact = input.allowContact !== false;
  const requiredFields = normalizeRequiredFields(input);

  return {
    kind: "feedback",
    formTitle: String(input.formTitle || EMPTY_FEEDBACK_CONFIG.formTitle),
    description: String(input.description || EMPTY_FEEDBACK_CONFIG.description),
    organizationName: String(input.organizationName ?? ""),
    locationLabel: String(input.locationLabel || buildLocationLabel(nextLocation)),
    location: nextLocation,
    categories: categories.length ? categories : EMPTY_FEEDBACK_CONFIG.categories,
    priorities: priorities.length ? priorities : EMPTY_FEEDBACK_CONFIG.priorities,
    subjects: cleanList(input.subjects, EMPTY_FEEDBACK_CONFIG.subjects),
    tags: cleanList(input.tags, []),
    formActive: input.formActive !== false,
    requiredFields,
    maxSelections: Number.isFinite(maxSelections) ? Math.min(10, Math.max(1, Math.floor(maxSelections))) : EMPTY_FEEDBACK_CONFIG.maxSelections,
    positiveFeedbackEnabled: input.positiveFeedbackEnabled !== false,
    positiveFeedbackLabel: String(input.positiveFeedbackLabel || EMPTY_FEEDBACK_CONFIG.positiveFeedbackLabel),
    allowContact,
    requireContact: requiredFields.contact || input.requireContact === true,
    submitButtonText: String(input.submitButtonText || EMPTY_FEEDBACK_CONFIG.submitButtonText),
    resetButtonText: String(input.resetButtonText || EMPTY_FEEDBACK_CONFIG.resetButtonText),
    privacyNotice: String(input.privacyNotice || EMPTY_FEEDBACK_CONFIG.privacyNotice),
    successMessage: String(input.successMessage || EMPTY_FEEDBACK_CONFIG.successMessage),
  };
}
