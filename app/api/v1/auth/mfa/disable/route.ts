import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { disableMFA } from "@/lib/services/mfaService";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await disableMFA(session.user.id);
    return NextResponse.json({ disabled: true });
  } catch {
    return NextResponse.json({ error: "2FA devre dışı bırakılamadı." }, { status: 500 });
  }
}
