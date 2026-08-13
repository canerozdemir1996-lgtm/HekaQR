import type { BulkRow } from "@/lib/bulk-import";

export interface BulkQrContext {
  batchId: string;
  rowNumber: number;
  publicOrigin: string;
  qrMode: "static" | "dynamic";
  styleId?: string | null;
  folderId?: string | null;
  organizationId?: string | null;
}

export function bulkImportSlug(batchId: string, rowNumber: number) {
  return `bi-${batchId.replace(/-/g, "").slice(0, 24)}-${rowNumber}`.slice(0, 40);
}

function escapeWifi(value: string) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:");
}

function targetForRow(row: BulkRow, slug: string, publicOrigin: string) {
  switch (row.type) {
    case "url":
      return row.fields.url;
    case "wifi":
      return `WIFI:T:${escapeWifi(row.fields.security || "WPA")};S:${escapeWifi(row.fields.ssid)};P:${escapeWifi(row.fields.password)};;`;
    case "vcard":
      return `${publicOrigin.replace(/\/$/, "")}/card/${slug}`;
    case "phone":
      return `tel:${(row.fields.phone || "").replace(/\s/g, "")}`;
    case "text":
      return row.fields.text;
    case "email":
      return `mailto:${row.fields.email}?subject=${encodeURIComponent(row.fields.subject || "")}&body=${encodeURIComponent(row.fields.body || "")}`;
    case "sms":
      return `sms:${(row.fields.phone || "").replace(/\s/g, "")}?body=${encodeURIComponent(row.fields.message || "")}`;
  }
}

export function buildBulkQrPayload(row: BulkRow, context: BulkQrContext) {
  const shortSlug = bulkImportSlug(context.batchId, context.rowNumber);
  return {
    title: row.title,
    short_slug: shortSlug,
    target_url: targetForRow(row, shortSlug, context.publicOrigin),
    qr_type: row.type,
    qr_mode: context.qrMode,
    is_dynamic: context.qrMode === "dynamic",
    is_active: row.is_active ?? true,
    style_id: context.styleId ?? null,
    folder_id: context.folderId ?? null,
    organization_id: context.organizationId ?? null,
    pixel_enabled: false,
    vcard_data: row.type === "vcard" ? {
      firstName: row.fields.firstName || row.title,
      lastName: row.fields.lastName || "",
      phone: row.fields.phone || undefined,
      email: row.fields.email || undefined,
      company: row.fields.company || undefined,
      template: "modern",
      accentColor: "#6366f1",
      coverColor: "#0f172a",
      avatar: "",
      coverImage: "",
      websites: [],
    } : null,
  };
}
