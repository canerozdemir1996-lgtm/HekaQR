import type { sbAdmin } from "@/lib/server/api-helpers";
import type { EnterpriseLimitsSnapshot } from "@/lib/plan-limits";

type Sb = ReturnType<typeof sbAdmin>;

// Row shape we read back from enterprise_quotes when building a paid snapshot.
type EnterpriseQuoteLimitRow = {
  dynamic_qr: number | null;
  menu_qr: number | null;
  vcard_pages: number | null;
  monthly_scans: number | null;
  team_members: number | null;
  white_label_domains: number | null;
  billing_preference: string | null;
};

export function buildEnterpriseSnapshotFromQuoteRow(
  row: EnterpriseQuoteLimitRow,
  quotePublicId: string,
): EnterpriseLimitsSnapshot {
  return {
    dynamicQr: row.dynamic_qr ?? undefined,
    menuQr: row.menu_qr ?? undefined,
    vcardPages: row.vcard_pages ?? undefined,
    monthlyScans: row.monthly_scans ?? undefined,
    teamMembers: row.team_members ?? undefined,
    whiteLabelDomains: row.white_label_domains ?? undefined,
    quote_id: quotePublicId,
    billing_preference: row.billing_preference ?? undefined,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Loads the paid Enterprise slider configuration for a quote (matched by the
 * `quote_id` echoed back in the Lemon Squeezy webhook custom_data) and shapes it
 * into a per-user limit snapshot. Returns null when the quote can't be found so
 * the caller simply skips the snapshot rather than failing the whole webhook.
 */
export async function loadEnterpriseSnapshotFromQuote(
  sb: Sb,
  quotePublicId: string | null | undefined,
): Promise<EnterpriseLimitsSnapshot | null> {
  const publicId = quotePublicId?.trim();
  if (!publicId) return null;

  const { data, error } = await sb
    .from("enterprise_quotes")
    .select("dynamic_qr, menu_qr, vcard_pages, monthly_scans, team_members, white_label_domains, billing_preference")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error || !data) return null;
  return buildEnterpriseSnapshotFromQuoteRow(data as EnterpriseQuoteLimitRow, publicId);
}
