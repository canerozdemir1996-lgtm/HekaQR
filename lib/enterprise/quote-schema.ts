import { z } from "zod";
import {
  ENTERPRISE_QUERY_KEYS,
  normalizeEnterpriseBillingPreference,
  normalizeEnterpriseConfiguration,
  type EnterpriseBillingPreference,
  type EnterpriseConfiguration,
  type EnterpriseMetricKey,
} from "@/lib/pricing/enterprise-pricing";

const phonePattern = /^[+\d][\d\s().-]{6,24}$/;

const enterpriseContactSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(25).regex(phonePattern),
  note: z.string().trim().max(1500).optional().or(z.literal("")),
});

const enterpriseConfigurationSchema = z.object(
  ENTERPRISE_QUERY_KEYS.reduce((shape, key) => {
    shape[key] = z.union([z.number().int(), z.string()]);
    return shape;
  }, {} as Record<EnterpriseMetricKey, z.ZodTypeAny>),
);

export const enterpriseQuoteRequestSchema = z.object({
  contact: enterpriseContactSchema,
  configuration: enterpriseConfigurationSchema,
  billingPreference: z.union([z.literal("monthly"), z.literal("yearly")]).optional(),
  website: z.string().optional(),
});

export const enterpriseQuoteFormSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(25).regex(phonePattern),
  note: z.string().trim().max(1500).optional().or(z.literal("")),
});

export type EnterpriseQuoteFormValues = z.infer<typeof enterpriseQuoteFormSchema>;
export type EnterpriseQuoteRequestBody = z.infer<typeof enterpriseQuoteRequestSchema>;

export function sanitizeEnterpriseConfiguration(
  input: Partial<Record<EnterpriseMetricKey, unknown>>,
  mode: "clamp" | "strict" = "strict",
): EnterpriseConfiguration {
  return normalizeEnterpriseConfiguration(input, mode);
}

export function sanitizeEnterpriseBillingPreference(value: unknown): EnterpriseBillingPreference {
  return normalizeEnterpriseBillingPreference(value);
}

export function normalizeEnterprisePhone(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

export function normalizeEnterpriseNote(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeEnterpriseContact(input: z.infer<typeof enterpriseContactSchema>) {
  return {
    fullName: input.fullName.trim(),
    company: input.company.trim(),
    email: input.email.trim().toLowerCase(),
    phone: normalizeEnterprisePhone(input.phone),
    note: normalizeEnterpriseNote(input.note),
  };
}
