import type { SupabaseClient } from "@supabase/supabase-js";
import { isSchemaCompatError } from "@/lib/server/api-helpers";

export type AccountDbClient = SupabaseClient<any, any, any, any, any>;

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "owns_shared_organization"; organizations: { id: string; name: string }[] }
  | { ok: false; reason: "error"; message: string };

/**
 * Kullanıcının sahip olduğu, başka aktif üyesi de bulunan organizasyonları
 * döndürür. Bu organizasyonlar varsa hesap silinmez — aksi halde diğer
 * üyelerin paylaşılan organizasyon verisi sahipleriyle birlikte kaybolurdu.
 */
async function findBlockingOrganizations(sb: AccountDbClient, userId: string) {
  const { data: owned, error } = await sb.from("organizations").select("id,name").eq("owner_id", userId);
  if (error) {
    if (isSchemaCompatError(error)) return [];
    throw error;
  }
  const ownedOrgs = (owned ?? []) as { id: string; name: string }[];
  if (ownedOrgs.length === 0) return [];

  const ownedIds = ownedOrgs.map(org => org.id);
  const { data: otherMembers, error: memberError } = await sb
    .from("organization_members")
    .select("org_id")
    .in("org_id", ownedIds)
    .eq("status", "active")
    .neq("user_id", userId);
  if (memberError) {
    if (isSchemaCompatError(memberError)) return [];
    throw memberError;
  }

  const blockedOrgIds = new Set((otherMembers ?? []).map((row: any) => row.org_id));
  return ownedOrgs.filter(org => blockedOrgIds.has(org.id));
}

async function safeDelete(sb: AccountDbClient, table: string, applyFilter: (query: any) => any) {
  const { error } = await applyFilter(sb.from(table).delete());
  if (error && !isSchemaCompatError(error)) throw error;
}

/**
 * KVKK/GDPR "hesabımı sil" akışı. Kullanıcının QR'larını, klasörlerini,
 * stillerini, API anahtarlarını, organizasyon üyeliklerini, kendisine
 * gönderilen mesajları ve en sonunda Supabase Auth hesabını siler.
 * Auth kaydı silinince profiles/user_settings/subscriptions/
 * billing_payment_history gibi tablolar FK cascade ile otomatik temizlenir;
 * bu fonksiyon ayrıca cascade garantisi belirsiz olan tabloları açıkça siler.
 */
export async function deleteUserAccount(sb: AccountDbClient, userId: string): Promise<DeleteAccountResult> {
  try {
    const blocking = await findBlockingOrganizations(sb, userId);
    if (blocking.length > 0) {
      return { ok: false, reason: "owns_shared_organization", organizations: blocking };
    }

    const { data: qrRows, error: qrLookupError } = await sb.from("qr_codes").select("id").eq("user_id", userId);
    if (qrLookupError && !isSchemaCompatError(qrLookupError)) throw qrLookupError;
    const qrIds = ((qrRows ?? []) as { id: string }[]).map(row => row.id);

    if (qrIds.length > 0) {
      await safeDelete(sb, "booking_submissions", q => q.in("qr_id", qrIds));
      await safeDelete(sb, "feedback_submissions", q => q.in("qr_id", qrIds));
      await safeDelete(sb, "scan_logs", q => q.in("qr_id", qrIds));
    }
    await safeDelete(sb, "booking_submissions", q => q.eq("user_id", userId));
    await safeDelete(sb, "feedback_submissions", q => q.eq("user_id", userId));
    await safeDelete(sb, "qr_codes", q => q.eq("user_id", userId));
    await safeDelete(sb, "qr_folders", q => q.eq("user_id", userId));
    await safeDelete(sb, "qr_styles", q => q.eq("user_id", userId));
    await safeDelete(sb, "qr_template_collections", q => q.eq("user_id", userId));
    await safeDelete(sb, "api_keys", q => q.eq("user_id", userId));
    await safeDelete(sb, "organization_members", q => q.eq("user_id", userId));
    await safeDelete(sb, "organizations", q => q.eq("owner_id", userId));
    await safeDelete(sb, "admin_messages", q => q.eq("to_user_id", userId));

    const { error: authDeleteError } = await sb.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    return { ok: true };
  } catch (err) {
    console.error("[deleteUserAccount] failed", err);
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "unknown error" };
  }
}
