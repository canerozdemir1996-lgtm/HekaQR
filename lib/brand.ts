export const BRAND_NAME = "QR Publish";
export const BRAND_DOMAIN = "qrpublish.com";
export const BRAND_ORIGIN = `https://${BRAND_DOMAIN}`;
export const BRAND_CONTACT_EMAIL = "contact@qrpublish.com";
export const BRAND_ASSET_VERSION = "20260716";

export const THEME_STORAGE_KEY = "qr-publish-theme";
export const LEGACY_THEME_STORAGE_KEYS = ["qrhub-theme"] as const;

export const IMPORT_HEADERS = {
  bulkCreate: "x-qrpublish-bulk-create",
  token: "x-qrpublish-import-token",
  batch: "x-qrpublish-import-batch",
  row: "x-qrpublish-import-row",
} as const;

export const LEGACY_IMPORT_HEADERS = {
  bulkCreate: "x-heka-bulk-create",
  token: "x-heka-import-token",
  batch: "x-heka-import-batch",
  row: "x-heka-import-row",
} as const;
