import { NextRequest, NextResponse } from "next/server";
import { authRequest, routeParams, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const payload = await req.json();
  const name = String(payload.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Klasör adı gerekli." }, { status: 400 });

  const { error } = await sbAdmin()
    .from("qr_folders")
    .update({ name })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await routeParams(context);
  const { error } = await sbAdmin()
    .from("qr_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
