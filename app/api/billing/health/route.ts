import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { roleFromMetadata } from "@/lib/auth";
import { getBillingHealthReport } from "@/lib/billing/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const role = roleFromMetadata(user);

  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Bu tanı aracı sadece owner/admin için açık." }, { status: 403 });
  }

  try {
    const report = await getBillingHealthReport();
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Billing health uretilemedi.",
      },
      { status: 500 },
    );
  }
}
