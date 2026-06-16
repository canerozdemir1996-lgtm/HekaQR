// Güvenli clipboard kopyalama - HTTP'de de çalışır
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API - HTTPS veya localhost'ta çalışır
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // izin reddedildi - fallback'e geç
    }
  }

  // Fallback: textarea yöntemi - HTTP'de de çalışır
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
