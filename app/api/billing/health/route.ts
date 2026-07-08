import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/authOptions";
import { getBillingHealthReport } from "@/lib/billing/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

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
