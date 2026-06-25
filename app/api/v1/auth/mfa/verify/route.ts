import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { verifyMFASetup } from "@/lib/services/mfaService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "6 haneli kodu girin." }, { status: 400 });
  }

  try {
    const verified = await verifyMFASetup(session.user.id, code);
    if (!verified) return NextResponse.json({ error: "Kod doğrulanamadı, lütfen tekrar deneyin." }, { status: 400 });
    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "Doğrulama başarısız. Lütfen önce 2FA kurulumunu başlatın." }, { status: 400 });
  }
}
