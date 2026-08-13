import { NextRequest, NextResponse } from "next/server";
import { RATE_LIMITS, checkRateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";
import { authRequest } from "@/lib/server/api-helpers";
import { runSeoAudit, SeoAuditError } from "@/lib/server/seo-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`seo_audit:${auth.userId}`, RATE_LIMITS.SEO_AUDIT.max, RATE_LIMITS.SEO_AUDIT.windowMs)) return tooManyRequestsResponse();
  const body = await req.json().catch(() => ({}));
  try {
    const result = await runSeoAudit(body.url);
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof SeoAuditError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[seo-audit] request failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "URL analiz edilemedi.", code: "AUDIT_FAILED" }, { status: 502 });
  }
}
