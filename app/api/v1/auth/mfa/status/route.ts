import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getMFAStatus } from "@/lib/services/mfaService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getMFAStatus(session.user.id);
  return NextResponse.json({ enabled: Boolean(status?.mfa_enabled && status?.verified) });
}
