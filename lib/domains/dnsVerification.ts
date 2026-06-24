import { randomBytes } from "crypto";
import { promises as dns } from "dns";

export const VERIFICATION_RECORD_PREFIX = "_qrpublish-verify";

export type ResolveTxtFn = (hostname: string) => Promise<string[][]>;

export function verificationRecordHost(domain: string): string {
  return `${VERIFICATION_RECORD_PREFIX}.${domain}`;
}

export function generateVerificationToken(): string {
  return randomBytes(16).toString("hex");
}

const DOMAIN_FORMAT = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export function isValidDomainFormat(domain: string): boolean {
  return DOMAIN_FORMAT.test(domain.trim());
}

/**
 * `_qrpublish-verify.<domain>` TXT kaydında beklenen token'ı arar.
 * DNS sorgusu başarısız olursa (NXDOMAIN, timeout vb.) hata fırlatmaz,
 * doğrulanamadı olarak kabul edip false döner.
 */
export async function verifyDomainTxtRecord(
  domain: string,
  expectedToken: string,
  resolveTxt: ResolveTxtFn = dns.resolveTxt,
): Promise<boolean> {
  try {
    const records = await resolveTxt(verificationRecordHost(domain));
    return records.some((parts) => parts.join("") === expectedToken);
  } catch {
    return false;
  }
}
