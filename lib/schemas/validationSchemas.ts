import { z } from "zod";

// ─── QR Code Schemas ────────────────────────────────────────────────────────
const httpUrl = z.string().url().refine(
  (v) => /^https?:\/\//i.test(v),
  { message: "Yalnızca http/https URL'lerine izin verilir" }
);

const safeTargetUrl = z.string().min(1).max(4000).refine((value) => {
  if (/^(javascript|data|vbscript):/i.test(value.trim())) return false;
  return /^(https?:\/\/|WIFI:|sms:|mailto:|tel:)/i.test(value.trim()) || !/^[a-z][a-z0-9+.-]*:/i.test(value.trim());
}, { message: "Güvenli olmayan hedef içerik" });

export const createQrCodeSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  short_slug: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  target_url: safeTargetUrl,
  qr_type: z.enum(["url", "product", "vcard", "multi", "wifi", "email", "sms", "phone", "whatsapp", "text", "menu", "feedback", "booking", "doc", "appstore", "quiz", "event", "location", "coupon", "gs1", "audio"]).optional(),
  password: z.string().max(64).optional().nullable(),
  scan_limit: z.number().int().positive().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  pixel_id: z.string().max(128).optional().nullable(),
  pixel_enabled: z.boolean().optional(),
  is_active: z.boolean().optional(),
  style_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  utm_source: z.string().max(128).optional().nullable(),
  utm_medium: z.string().max(128).optional().nullable(),
  utm_campaign: z.string().max(128).optional().nullable(),
  utm_term: z.string().max(128).optional().nullable(),
  utm_content: z.string().max(128).optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(500).optional().nullable(),
  redirect_type: z.enum(["301", "302"]).optional().nullable(),
  ab_test_url: httpUrl.optional().nullable(),
  ab_test_weight: z.number().min(0).max(1).optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  ga4_measurement_id: z.string().max(64).optional().nullable(),
  gtm_container_id: z.string().max(64).optional().nullable(),
  webhook_url: httpUrl.optional().nullable(),
  // Dinamik içerik / tip-spesifik alanlar — derin doğrulama bu katmanın kapsamı dışında,
  // sadece tip ve üst düzey şekil kontrol edilir.
  vcard_data: z.record(z.any()).optional().nullable(),
  dynamic_content: z.record(z.any()).optional().nullable(),
  is_dynamic: z.boolean().optional(),
  rules: z.record(z.any()).optional(),
  event_data: z.record(z.any()).optional().nullable(),
  location_data: z.record(z.any()).optional().nullable(),
  document_urls: z.array(z.string()).optional(),
  logo_url: z.string().optional().nullable(),
  qr_design: z.record(z.any()).optional().nullable(),
  frame_style: z.string().optional().nullable(),
  logo_transparent: z.boolean().optional(),
  logo_size_percent: z.number().optional(),
});

export const updateQrCodeSchema = createQrCodeSchema.partial();

export type CreateQrCodeInput = z.infer<typeof createQrCodeSchema>;
export type UpdateQrCodeInput = z.infer<typeof updateQrCodeSchema>;

// ─── User Schemas ────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().max(255).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(["user", "admin", "owner"]).optional(),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─── Settings Schema ────────────────────────────────────────────────────────
export const settingsSchema = z.object({
  custom_domain: z.string().max(255).optional().nullable(),
  ga4_measurement_id: z.string().max(64).optional().nullable(),
  gtm_container_id: z.string().max(64).optional().nullable(),
  webhook_url: z.string().url().optional().nullable(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

// ─── Bulk QR Schema ────────────────────────────────────────────────────────
export const bulkQrRowSchema = z.object({
  title: z.string().min(1).max(255),
  target_url: z.string().url(),
  is_active: z.boolean().optional(),
});

export const bulkQrSchema = z.array(bulkQrRowSchema).min(1);

export type BulkQrInput = z.infer<typeof bulkQrSchema>;

// ─── Validation Helper ────────────────────────────────────────────────────────
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

export const safeValidateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T | null; error: z.ZodError | null } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data, error: null };
  }
  return { data: null, error: result.error };
};
