import { NextRequest, NextResponse } from "next/server";
import { authRequest, routeParams, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { verifyDomainTxtRecord } from "@/lib/domains/dnsVerification";
import { addDomainToVercelProject } from "@/lib/domains/vercel";

export const dynamic = "force-dynamic";

// POST /api/v1/custom-domains/[id]/verify — domain için _qrpublish-verify
// TXT kaydını kontrol eder. Doğrulanırsa status="verified" olur ve domain
// (yapılandırılmışsa) best-effort olarak Vercel projesine eklenir.
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { id } = await routeParams(context);
  const sb = sbAdmin();

  const { data: record, error: lookupError } = await sb
    .from("custom_domains")
    .select("id,domain,verification_token,status")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: safeDbErrorMessage(lookupError, "custom-domains.verify.lookup") }, { status: 500 });
  if (!record) return NextResponse.json({ error: "Domain bulunamadı." }, { status: 404 });

  const verified = await verifyDomainTxtRecord(record.domain, record.verification_token);
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await sb
    .from("custom_domains")
    .update({
      status: verified ? "verified" : "failed",
      verified_at: verified ? now : null,
      last_checked_at: now,
    })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: safeDbErrorMessage(updateError, "custom-domains.verify.update") }, { status: 500 });

  if (verified) {
    await addDomainToVercelProject(record.domain);
  }

  return NextResponse.json({
    verified,
    domain: updated,
    error: verified ? undefined : "DNS TXT kaydı bulunamadı veya değer eşleşmedi. Yayılması birkaç dakika sürebilir.",
  });
}
