import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { clientIp } from "@/lib/rateLimit";
import { routeParams, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function fingerprint(req: NextRequest) {
  return crypto.createHash("sha256").update(`${clientIp(req)}:${req.headers.get("user-agent") ?? ""}`).digest("hex");
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await routeParams(context);
  const slug = String(req.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!id || !slug) return NextResponse.json({ error: "Sonuç bulunamadı." }, { status: 404 });

  const { data, error } = await sbAdmin()
    .from("exam_submissions")
    .select("id,qr_id,participant,submitted_at,time_used_seconds,score,max_score,correct_count,wrong_count,blank_count,passed,status,attempt_fingerprint,qr_codes!inner(short_slug,title)")
    .eq("id", id)
    .eq("qr_codes.short_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "exam.RESULT.lookup") }, { status: 500 });
  if (!data || data.attempt_fingerprint !== fingerprint(req)) return NextResponse.json({ error: "Sonuç bulunamadı." }, { status: 404 });

  return NextResponse.json({
    submission: {
      id: data.id,
      participant: data.participant,
      submitted_at: data.submitted_at,
      time_used_seconds: data.time_used_seconds,
      score: data.score,
      max_score: data.max_score,
      correct_count: data.correct_count,
      wrong_count: data.wrong_count,
      blank_count: data.blank_count,
      passed: data.passed,
      status: data.status,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
