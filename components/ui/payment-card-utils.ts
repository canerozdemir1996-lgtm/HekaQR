export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export function getCardBrand(number: string): CardBrand {
  const cleanNumber = number.replace(/\D/g, "");
  if (cleanNumber.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(cleanNumber)) return "mastercard";
  if (/^3[47]/.test(cleanNumber)) return "amex";
  return "unknown";
}

export function formatCardNumber(value: string): string {
  const normalized = value.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  const brand = getCardBrand(normalized);

  if (brand === "amex") {
    const parts: string[] = [];
    if (normalized.length > 0) parts.push(normalized.substring(0, 4));
    if (normalized.length > 4) parts.push(normalized.substring(4, 10));
    if (normalized.length > 10) parts.push(normalized.substring(10, 15));
    return parts.join(" ");
  }

  const matches = normalized.match(/\d{1,4}/g);
  return matches ? matches.join(" ").substring(0, 19) : normalized;
}

export function formatExpiry(value: string): string {
  const normalized = value.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (normalized.length >= 2) {
    return `${normalized.substring(0, 2)}/${normalized.substring(2, 4)}`;
  }
  return normalized;
}

export function formatCvc(value: string, brand: CardBrand): string {
  const normalized = value.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  const maxLength = brand === "amex" ? 4 : 3;
  return normalized.substring(0, maxLength);
}
