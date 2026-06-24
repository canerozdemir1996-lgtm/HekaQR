import { NextRequest, NextResponse } from "next/server";
import { authRequest, routeParams, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { removeDomainFromVercelProject } from "@/lib/domains/vercel";

export const dynamic = "force-dynamic";

// DELETE /api/v1/custom-domains/[id] — domaini siler ve (yapılandırılmışsa)
// Vercel projesinden best-effort olarak kaldırır.
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { id } = await routeParams(context);
  const sb = sbAdmin();

  const { data: existing, error: lookupError } = await sb
    .from("custom_domains")
    .select("id,domain")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: safeDbErrorMessage(lookupError, "custom-domains.DELETE.lookup") }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Domain bulunamadı." }, { status: 404 });

  const { error: deleteError } = await sb
    .from("custom_domains")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (deleteError) return NextResponse.json({ error: safeDbErrorMessage(deleteError, "custom-domains.DELETE") }, { status: 500 });

  await removeDomainFromVercelProject(existing.domain);

  return NextResponse.json({ deleted: true });
}
