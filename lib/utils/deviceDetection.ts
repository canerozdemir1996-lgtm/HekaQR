// ─── Device Detection ────────────────────────────────────────────────────────
export function detectDevice(userAgent: string): "Mobile" | "Tablet" | "Desktop" {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return "Tablet";
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

export function detectOS(userAgent: string): string {
  if (/windows nt/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}

export function parseUserAgent(userAgent: string) {
  return {
    device: detectDevice(userAgent),
    os: detectOS(userAgent),
  };
}

// ─── Browser Detection ────────────────────────────────────────────────────────
export function detectBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return "Edge";
  if (/chrome/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return "Safari";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/opera|opr/i.test(userAgent)) return "Opera";
  return "Unknown";
}
