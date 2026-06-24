import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { canAccessFeature } from "@/lib/check-plan";
import { generateVerificationToken, isValidDomainFormat, verificationRecordHost } from "@/lib/domains/dnsVerification";

export const dynamic = "force-dynamic";

// GET /api/v1/custom-domains — kullanıcının eklediği domainleri listeler.
export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { data, error } = await sbAdmin()
    .from("custom_domains")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "custom-domains.GET") }, { status: 500 });
  return NextResponse.json({ domains: data ?? [] });
}

// POST /api/v1/custom-domains — yeni domain ekler, doğrulama için bir
// verification_token üretir. Domain "pending" durumunda oluşturulur;
// sahiplik DNS TXT kaydıyla doğrulanana kadar kullanılamaz.
export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const allowed = await canAccessFeature(auth.userId, "custom_domain");
  if (!allowed) {
    return NextResponse.json({ error: "Custom domain özelliği planınızda yer almıyor." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const domain = String(body?.domain ?? "").trim().toLowerCase();
  if (!domain || !isValidDomainFormat(domain)) {
    return NextResponse.json({ error: "Geçerli bir domain adı girin (örn. qr.firmaniz.com)." }, { status: 400 });
  }

  const verificationToken = generateVerificationToken();
  const { data, error } = await sbAdmin()
    .from("custom_domains")
    .insert({
      user_id: auth.userId,
      domain,
      verification_token: verificationToken,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu domain zaten kayıtlı." }, { status: 409 });
    }
    return NextResponse.json({ error: safeDbErrorMessage(error, "custom-domains.POST") }, { status: 500 });
  }

  return NextResponse.json(
    {
      domain: data,
      dns_instructions: {
        type: "TXT",
        host: verificationRecordHost(domain),
        value: verificationToken,
      },
    },
    { status: 201 },
  );
}
