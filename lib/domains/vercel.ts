const VERCEL_API_BASE = "https://api.vercel.com";

type FetchFn = typeof fetch;

export function isVercelDomainsConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

function teamQueryParam(): string {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

export type VercelDomainResult = { ok: boolean; error?: string };

/**
 * Doğrulanan bir custom domain'i Vercel projesine bağlar. VERCEL_API_TOKEN/
 * VERCEL_PROJECT_ID ayarlı değilse sessizce atlar (Resend pattern'iyle
 * aynı yaklaşım) — best-effort, hata fırlatmaz.
 */
export async function addDomainToVercelProject(
  domain: string,
  fetchFn: FetchFn = fetch,
): Promise<VercelDomainResult> {
  if (!isVercelDomainsConfigured()) return { ok: false, error: "not_configured" };

  try {
    const res = await fetchFn(
      `${VERCEL_API_BASE}/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${teamQueryParam()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[addDomainToVercelProject] failed", { domain, error: err });
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function removeDomainFromVercelProject(
  domain: string,
  fetchFn: FetchFn = fetch,
): Promise<VercelDomainResult> {
  if (!isVercelDomainsConfigured()) return { ok: false, error: "not_configured" };

  try {
    const res = await fetchFn(
      `${VERCEL_API_BASE}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}${teamQueryParam()}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
      },
    );
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => null);
      return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[removeDomainFromVercelProject] failed", { domain, error: err });
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
