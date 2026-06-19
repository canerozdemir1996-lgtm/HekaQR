import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LABEL, type PlanKey } from "@/lib/plan-limits";

export const audienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single"), userId: z.string().uuid() }),
  z.object({ type: z.literal("plan"), plan: z.enum(["free", "starter", "pro", "enterprise"]) }),
  z.object({ type: z.literal("organization"), orgId: z.string().uuid() }),
  z.object({ type: z.literal("all") }),
]);

export type Audience = z.infer<typeof audienceSchema>;

export type ResolvedRecipient = { userId: string };

/**
 * Resolves an audience selector to a concrete list of recipient user ids,
 * plus a human-readable label snapshot for the admin message list.
 */
export async function resolveAudience(
  sbAdmin: SupabaseClient<any, any, any, any, any>,
  audience: Audience
): Promise<{ recipients: ResolvedRecipient[]; label: string }> {
  if (audience.type === "single") {
    return { recipients: [{ userId: audience.userId }], label: "Tek kullanıcı" };
  }

  if (audience.type === "plan") {
    const { data, error } = await sbAdmin
      .from("user_settings")
      .select("user_id")
      .eq("current_plan", audience.plan);
    if (error) throw error;
    const recipients = (data ?? []).map((row: { user_id: string }) => ({ userId: row.user_id }));
    const planLabel = PLAN_LABEL[audience.plan as PlanKey] ?? audience.plan;
    return { recipients, label: `${planLabel} plan · ${recipients.length} kullanıcı` };
  }

  if (audience.type === "organization") {
    const { data, error } = await sbAdmin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", audience.orgId)
      .eq("status", "active");
    if (error) throw error;
    const recipients = (data ?? []).map((row: { user_id: string }) => ({ userId: row.user_id }));
    const { data: org } = await sbAdmin.from("organizations").select("name").eq("id", audience.orgId).maybeSingle();
    const orgLabel = org?.name ?? "Organizasyon";
    return { recipients, label: `${orgLabel} · ${recipients.length} kullanıcı` };
  }

  // type === "all"
  const { data, error } = await sbAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const recipients = (data?.users ?? []).map((u: { id: string }) => ({ userId: u.id }));
  return { recipients, label: `Tüm kullanıcılar · ${recipients.length} kullanıcı` };
}

export type BroadcastMessageInput = {
  fromUserId: string;
  title: string;
  body: string;
  popupKind: "small" | "big";
};

export type BroadcastMessageRow = {
  from_user_id: string;
  to_user_id: string;
  title: string;
  body: string;
  popup_kind: "small" | "big";
  batch_id: string;
  audience_type: Audience["type"];
  audience_label: string;
};

/** Builds one admin_messages row per recipient, all sharing the same batch_id. */
export function buildBroadcastRows(
  recipients: ResolvedRecipient[],
  audienceType: Audience["type"],
  audienceLabel: string,
  batchId: string,
  message: BroadcastMessageInput
): BroadcastMessageRow[] {
  return recipients.map(r => ({
    from_user_id: message.fromUserId,
    to_user_id: r.userId,
    title: message.title,
    body: message.body,
    popup_kind: message.popupKind,
    batch_id: batchId,
    audience_type: audienceType,
    audience_label: audienceLabel,
  }));
}
