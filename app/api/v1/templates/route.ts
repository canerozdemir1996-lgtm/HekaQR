import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { listVisibleQrTemplates } from "@/lib/qr-templates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const category = req.nextUrl.searchParams.get("category")?.trim().toLowerCase() || null;
    const scope = req.nextUrl.searchParams.get("scope")?.trim().toLowerCase() || "all";

    let templates = await listVisibleQrTemplates(sbAdmin(), auth.userId);
    if (category) {
      templates = templates.filter((template) => String(template.category).toLowerCase() === category);
    }
    if (scope === "own" || scope === "system" || scope === "public") {
      templates = templates.filter((template) => template.scope === scope || template.visibility === scope);
    }

    return NextResponse.json(
      { templates, total: templates.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const dbError = error as { message: string; code?: string };
    return NextResponse.json({ error: safeDbErrorMessage(dbError, "templates.GET", "Şablonlar yüklenemedi.") }, { status: 500 });
  }
}
