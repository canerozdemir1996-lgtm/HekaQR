import type { SupabaseClient } from "@supabase/supabase-js";

export type QrTemplateRow = {
  id: string;
  name: string;
  config?: Record<string, unknown> | null;
  category?: string | null;
  visibility?: string | null;
  description?: string | null;
  preview_url?: string | null;
  collection_id?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TemplatePayload = {
  template_id?: string | null;
  style_id?: string | null;
};

const TEMPLATE_COLUMNS = [
  "id",
  "name",
  "config",
  "category",
  "visibility",
  "description",
  "preview_url",
  "collection_id",
  "user_id",
  "created_at",
  "updated_at",
].join(",");

export function hasQrTemplateSelection(payload: TemplatePayload) {
  return Object.prototype.hasOwnProperty.call(payload, "template_id")
    || Object.prototype.hasOwnProperty.call(payload, "style_id");
}

export function resolveQrTemplateId(payload: TemplatePayload) {
  if (payload.template_id !== undefined) return payload.template_id ?? null;
  if (payload.style_id !== undefined) return payload.style_id ?? null;
  return null;
}

export function resolveQrDesignOverride(
  hasCustomChanges: boolean,
  config: Record<string, unknown>,
) {
  return hasCustomChanges ? config : null;
}

export function canUseQrTemplate(template: QrTemplateRow | null | undefined, userId: string) {
  if (!template) return false;
  return template.user_id === userId || template.visibility === "system" || template.visibility === "public";
}

export function toApiQrTemplate(template: QrTemplateRow, userId: string) {
  const visibility = template.visibility ?? (template.user_id === userId ? "private" : "system");
  return {
    id: template.id,
    name: template.name,
    category: template.category ?? "custom",
    visibility,
    scope: template.user_id === userId ? "own" : visibility,
    description: template.description ?? null,
    preview_url: template.preview_url ?? null,
    collection_id: template.collection_id ?? null,
    config: template.config ?? {},
    created_at: template.created_at ?? null,
    updated_at: template.updated_at ?? null,
  };
}

export async function listVisibleQrTemplates(sb: SupabaseClient<any>, userId: string) {
  const { data, error } = await sb
    .from("qr_styles")
    .select(TEMPLATE_COLUMNS)
    .or(`visibility.in.(system,public),user_id.eq.${userId}`)
    .order("visibility", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as QrTemplateRow[])
    .filter((template) => canUseQrTemplate(template, userId))
    .map((template) => toApiQrTemplate(template, userId));
}

export async function getVisibleQrTemplate(sb: SupabaseClient<any>, userId: string, templateId: string) {
  const { data, error } = await sb
    .from("qr_styles")
    .select(TEMPLATE_COLUMNS)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;
  const template = data as QrTemplateRow | null;
  return canUseQrTemplate(template, userId) ? template : null;
}
