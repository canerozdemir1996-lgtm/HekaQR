import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, digest, stack } = await req.json();
    console.error("[client-error]", { message, digest, stack });
  } catch { /* ignore malformed body */ }
  return NextResponse.json({ ok: true });
}
