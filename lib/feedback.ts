export type FeedbackKind = "complaint" | "suggestion" | "request" | "thanks";
export type FeedbackPriority = "low" | "normal" | "high" | "urgent";
export type FeedbackStatus = "new" | "reviewing" | "resolved" | "closed";

export type FeedbackLocation = {
  campus?: string;
  building?: string;
  floor?: string;
  unit?: string;
  room?: string;
  asset?: string;
};

export type FeedbackConfig = {
  kind?: "feedback";
  formTitle: string;
  organizationName?: string;
  locationLabel: string;
  location: FeedbackLocation;
  categories: FeedbackKind[];
  priorities: FeedbackPriority[];
  allowContact: boolean;
  requireContact: boolean;
  successMessage: string;
};

export type FeedbackSubmission = {
  id: string;
  qr_id: string;
  user_id: string;
  kind: FeedbackKind;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  message: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  location_label?: string | null;
  location_data?: FeedbackLocation | null;
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
  reviewing: "İnceleniyor",
  resolved: "Çözüldü",
  closed: "Kapandı",
};

export const EMPTY_FEEDBACK_CONFIG: FeedbackConfig = {
  kind: "feedback",
  formTitle: "Şikayet, Öneri ve İstek Formu",
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
  allowContact: true,
  requireContact: false,
  successMessage: "Bildiriminiz alındı. Ekibimiz en kısa sürede inceleyecek.",
};

export function buildLocationLabel(location: FeedbackLocation) {
  return [location.campus, location.building, location.floor, location.unit, location.room, location.asset]
    .map(part => String(part ?? "").trim())
    .filter(Boolean)
    .join(" - ");
}

export function normalizeFeedbackConfig(value: unknown): FeedbackConfig {
  const input = value && typeof value === "object" ? value as Partial<FeedbackConfig> : {};
  const location = input.location && typeof input.location === "object" ? input.location : {};
  const categories = Array.isArray(input.categories) && input.categories.length
    ? input.categories.filter((item): item is FeedbackKind => ["complaint", "suggestion", "request", "thanks"].includes(String(item)))
    : EMPTY_FEEDBACK_CONFIG.categories;
  const priorities = Array.isArray(input.priorities) && input.priorities.length
    ? input.priorities.filter((item): item is FeedbackPriority => ["low", "normal", "high", "urgent"].includes(String(item)))
    : EMPTY_FEEDBACK_CONFIG.priorities;
  const nextLocation: FeedbackLocation = {
    campus: String(location.campus ?? ""),
    building: String(location.building ?? ""),
    floor: String(location.floor ?? ""),
    unit: String(location.unit ?? ""),
    room: String(location.room ?? ""),
    asset: String(location.asset ?? ""),
  };

  return {
    kind: "feedback",
    formTitle: String(input.formTitle || EMPTY_FEEDBACK_CONFIG.formTitle),
    organizationName: String(input.organizationName ?? ""),
    locationLabel: String(input.locationLabel || buildLocationLabel(nextLocation)),
    location: nextLocation,
    categories: categories.length ? categories : EMPTY_FEEDBACK_CONFIG.categories,
    priorities: priorities.length ? priorities : EMPTY_FEEDBACK_CONFIG.priorities,
    allowContact: input.allowContact !== false,
    requireContact: input.requireContact === true,
    successMessage: String(input.successMessage || EMPTY_FEEDBACK_CONFIG.successMessage),
  };
}
