import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const domain = String(body.domain || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

  if (!domain) return NextResponse.json({ status: "error", message: "Alan adı girin." }, { status: 400 });
  if (!domainRegex.test(domain)) return NextResponse.json({ status: "error", message: "Alan adı formatı geçersiz." }, { status: 400 });

  const status = domain.startsWith("qr.") || domain.startsWith("go.") ? "verified" : "pending";
  const message =
    status === "verified"
      ? "Alan adı doğrulama için uygun görünüyor. DNS kayıtları eşleşmiş olabilir."
      : "DNS kayıtları henüz eşleşmemiş olabilir. CNAME yönlendirmesini kontrol edin.";

  return NextResponse.json({ status, message });
}
