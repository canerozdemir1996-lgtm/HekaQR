export type QrMode = "static" | "dynamic";

export type QrCapability = {
  supportsStatic: boolean;
  supportsDynamic: boolean;
  requiresHosting: boolean;
  supportsAnalytics: boolean;
  supportsEditableDestination: boolean;
  supportsBulkCreation: boolean;
};

const STATIC_ONLY: QrCapability = {
  supportsStatic: true,
  supportsDynamic: false,
  requiresHosting: false,
  supportsAnalytics: false,
  supportsEditableDestination: false,
  supportsBulkCreation: true,
};

const DYNAMIC_ONLY: QrCapability = {
  supportsStatic: false,
  supportsDynamic: true,
  requiresHosting: true,
  supportsAnalytics: true,
  supportsEditableDestination: true,
  supportsBulkCreation: false,
};

const BOTH: QrCapability = {
  supportsStatic: true,
  supportsDynamic: true,
  requiresHosting: false,
  supportsAnalytics: true,
  supportsEditableDestination: true,
  supportsBulkCreation: true,
};

export const QR_CAPABILITIES: Record<string, QrCapability> = {
  url: BOTH,
  product: BOTH,
  whatsapp: BOTH,
  email: BOTH,
  location: BOTH,
  vcard: BOTH,
  wifi: STATIC_ONLY,
  sms: STATIC_ONLY,
  phone: STATIC_ONLY,
  text: STATIC_ONLY,
  menu: DYNAMIC_ONLY,
  multi: DYNAMIC_ONLY,
  feedback: DYNAMIC_ONLY,
  booking: DYNAMIC_ONLY,
  doc: DYNAMIC_ONLY,
  document: DYNAMIC_ONLY,
  appstore: DYNAMIC_ONLY,
  quiz: DYNAMIC_ONLY,
  coupon: DYNAMIC_ONLY,
  event: DYNAMIC_ONLY,
};

export function getQrCapability(qrType: string | null | undefined): QrCapability {
  return QR_CAPABILITIES[qrType ?? "url"] ?? BOTH;
}

export function supportsQrMode(qrType: string | null | undefined, mode: QrMode) {
  const capability = getQrCapability(qrType);
  return mode === "static" ? capability.supportsStatic : capability.supportsDynamic;
}
