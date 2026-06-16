import { parseUserAgent } from "./deviceDetection";

export interface DeviceRules {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}

export interface CountryRules {
  [country: string]: string;
}

export interface ScheduleRule {
  start?: string;
  end?: string;
  url: string;
}

export interface QRRules {
  device_redirect?: DeviceRules;
  country_redirect?: CountryRules;
  schedule_redirect?: ScheduleRule[];
}

// ─── Rule Engine ────────────────────────────────────────────────────────────

/**
 * Apply rules to determine the final redirect URL
 * Priority: Schedule > Country > Device
 */
export function applyRules(
  baseUrl: string,
  rules: QRRules | null | undefined,
  options: {
    userAgent?: string;
    country?: string;
  } = {}
): string {
  if (!rules) return baseUrl;

  const { userAgent = "", country = "" } = options;

  // 1) Schedule rules (highest priority)
  if (Array.isArray(rules.schedule_redirect) && rules.schedule_redirect.length > 0) {
    const now = new Date();
    for (const rule of rules.schedule_redirect) {
      const startOk = !rule.start || now >= new Date(rule.start);
      const endOk = !rule.end || now <= new Date(rule.end);
      if (startOk && endOk && rule.url) return rule.url;
    }
  }

  // 2) Country rules
  const upperCountry = country?.toUpperCase() || "";
  if (upperCountry && rules.country_redirect?.[upperCountry]) {
    return rules.country_redirect[upperCountry];
  }

  // 3) Device rules (lowest priority)
  if (rules.device_redirect && userAgent) {
    const { device } = parseUserAgent(userAgent);
    const dr = rules.device_redirect;

    if (device === "Mobile" && dr.mobile) return dr.mobile;
    if (device === "Tablet" && dr.tablet) return dr.tablet;
    if (device === "Desktop" && dr.desktop) return dr.desktop;
  }

  return baseUrl;
}

/**
 * Validate rule URLs
 */
export function validateRules(rules: unknown): rules is QRRules {
  if (!rules || typeof rules !== "object") return true; // null/undefined is valid
  const r = rules as Record<string, unknown>;

  // Validate device_redirect
  if (r.device_redirect && typeof r.device_redirect === "object") {
    const dr = r.device_redirect as Record<string, unknown>;
    for (const [key, val] of Object.entries(dr)) {
      if (!["mobile", "tablet", "desktop"].includes(key) || (val && typeof val !== "string")) {
        return false;
      }
    }
  }

  // Validate country_redirect
  if (r.country_redirect && typeof r.country_redirect === "object") {
    const cr = r.country_redirect as Record<string, unknown>;
    for (const val of Object.values(cr)) {
      if (val && typeof val !== "string") return false;
    }
  }

  // Validate schedule_redirect
  if (Array.isArray(r.schedule_redirect)) {
    for (const sr of r.schedule_redirect) {
      if (!sr || typeof sr !== "object") return false;
      const s = sr as Record<string, unknown>;
      if (!s.url || typeof s.url !== "string") return false;
      if (s.start && typeof s.start !== "string") return false;
      if (s.end && typeof s.end !== "string") return false;
    }
  }

  return true;
}

/**
 * Get a human-readable description of rules
 */
export function describeRules(rules: QRRules | null | undefined): string[] {
  if (!rules) return [];
  const descriptions: string[] = [];

  if (rules.device_redirect) {
    const devices = Object.entries(rules.device_redirect)
      .filter(([, url]) => url)
      .map(([device]) => device)
      .join(", ");
    if (devices) descriptions.push(`📱 Device redirect: ${devices}`);
  }

  if (rules.country_redirect) {
    const countries = Object.keys(rules.country_redirect).join(", ");
    if (countries) descriptions.push(`🌍 Country redirect: ${countries}`);
  }

  if (rules.schedule_redirect?.length) {
    descriptions.push(`🕐 Schedule rules: ${rules.schedule_redirect.length} rule(s)`);
  }

  return descriptions;
}
