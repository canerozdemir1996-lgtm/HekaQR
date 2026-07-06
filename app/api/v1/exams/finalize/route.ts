import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const qrId = cleanText(body.qrId, 120);
  if (!qrId) return NextResponse.json({ error: "Sınav bulunamadı." }, { status: 400 });

  const { data: qr, error: qrError } = await sbAdmin()
    .from("qr_codes")
    .select("id,user_id")
    .eq("id", qrId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (qrError) return NextResponse.json({ error: safeDbErrorMessage(qrError, "exam.FINALIZE.qr") }, { status: 500 });
  if (!qr) return NextResponse.json({ error: "Sınav bulunamadı." }, { status: 404 });

  const { data: submissions, error: listError } = await sbAdmin()
    .from("exam_submissions")
    .select("id")
    .eq("qr_id", qr.id)
    .eq("user_id", auth.userId);
  if (listError) return NextResponse.json({ error: safeDbErrorMessage(listError, "exam.FINALIZE.list") }, { status: 500 });

  const ids = (submissions ?? []).map(row => row.id).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ updated: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  const { error: answerError } = await sbAdmin()
    .from("exam_answers")
    .update({ correct_answer: "__manual_final__" })
    .in("submission_id", ids);
  if (answerError) return NextResponse.json({ error: safeDbErrorMessage(answerError, "exam.FINALIZE.answers") }, { status: 500 });

  const { data: updated, error: updateError } = await sbAdmin()
    .from("exam_submissions")
    .update({ status: "submitted" })
    .in("id", ids)
    .select("id,status");
  if (updateError) return NextResponse.json({ error: safeDbErrorMessage(updateError, "exam.FINALIZE.update") }, { status: 500 });

  return NextResponse.json({ updated: updated?.length ?? 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
