import { z } from "zod";

// ─── QR Code Schemas ────────────────────────────────────────────────────────
export const createQrCodeSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  target_url: z.string().url(),
  qr_type: z.enum(["url", "product", "vcard", "wifi", "email", "sms", "phone", "whatsapp", "text"]).optional(),
  password: z.string().max(64).optional().nullable(),
  scan_limit: z.number().int().positive().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  pixel_id: z.string().max(128).optional().nullable(),
  pixel_enabled: z.boolean().optional(),
  is_active: z.boolean().optional(),
  style_id: z.string().uuid().optional().nullable(),
  utm_source: z.string().max(128).optional().nullable(),
  utm_medium: z.string().max(128).optional().nullable(),
  utm_campaign: z.string().max(128).optional().nullable(),
  utm_term: z.string().max(128).optional().nullable(),
  utm_content: z.string().max(128).optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(500).optional().nullable(),
  redirect_type: z.enum(["301", "302"]).optional().nullable(),
  ab_test_url: z.string().url().optional().nullable(),
  ab_test_weight: z.number().min(0).max(1).optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  ga4_measurement_id: z.string().max(64).optional().nullable(),
  gtm_container_id: z.string().max(64).optional().nullable(),
  webhook_url: z.string().url().optional().nullable(),
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
