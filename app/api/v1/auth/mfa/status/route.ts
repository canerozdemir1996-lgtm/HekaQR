import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getMFAStatus } from "@/lib/services/mfaService";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getMFAStatus(user.id);
  return NextResponse.json({ enabled: Boolean(status?.mfa_enabled && status?.verified) });
}
