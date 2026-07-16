import { NextRequest, NextResponse } from "next/server";
import { normalizeExamConfig } from "@/lib/exam";
import { EXAM_EXTRA_TIME_EVENT_QUESTION_ID } from "@/lib/exam-extra-time";
import { sendOwnerNotificationEmail } from "@/lib/email/resend";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ") || "-";
  return String(value ?? "").trim() || "-";
}

function correctAnswerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ") || "-";
  return String(value ?? "").trim() || "-";
}

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function currentUserEmail() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.trim().toLowerCase() || null;
}

async function loadRows(email: string) {
  return sbAdmin()
    .from("exam_submissions")
    .select("*, qr_codes!inner(id,title,short_slug,dynamic_content), exam_answers(*)")
    .filter("participant->>email", "eq", email)
    .order("created_at", { ascending: false })
    .limit(200);
}

function mapRows(rows: any[]) {
  return rows.map(row => {
    const qr = Array.isArray(row.qr_codes) ? row.qr_codes[0] : row.qr_codes;
    const config = normalizeExamConfig(qr?.dynamic_content, qr?.title ?? "Sınav");
    const questionMap = new Map(config.questions.map(question => [question.id, question]));
    return {
      id: row.id,
      qr_id: row.qr_id,
      qr_title: qr?.title ?? "Sınav",
      qr_slug: qr?.short_slug ?? "",
      participant: row.participant,
      submitted_at: row.submitted_at,
      started_at: row.started_at,
      time_used_seconds: row.time_used_seconds,
      score: row.score,
      max_score: row.max_score,
      correct_count: row.correct_count,
      wrong_count: row.wrong_count,
      blank_count: row.blank_count,
      passed: row.passed,
      status: row.status,
      show_question_summary: config.showQuestionSummary,
      answers: (row.exam_answers ?? []).filter((answer: any) => answer.question_id !== EXAM_EXTRA_TIME_EVENT_QUESTION_ID).map((answer: any) => {
        const question = questionMap.get(answer.question_id);
        const canShowEvaluation = config.showQuestionSummary && row.status !== "needs_review" && row.status !== "in_progress";
        return {
          id: answer.id,
          question_id: answer.question_id,
          prompt: question?.prompt ?? answer.question_id,
          answer: answer.answer,
          correct_answer: canShowEvaluation ? answer.correct_answer : null,
          is_correct: canShowEvaluation ? answer.is_correct : null,
          points: answer.points,
          max_points: question?.points ?? 0,
          type: question?.type ?? "multiple_choice",
        };
      }),
    };
  });
}

export async function GET() {
  const email = await currentUserEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await loadRows(email);
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "exam.MY.list") }, { status: 500 });

  return NextResponse.json({ submissions: mapRows(data ?? []) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(req: NextRequest) {
  const email = await currentUserEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const submissionId = String(body.submissionId ?? "").trim();
  if (!submissionId) return NextResponse.json({ error: "submissionId zorunlu" }, { status: 400 });

  const { data, error } = await loadRows(email);
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "exam.MY.email") }, { status: 500 });
  const row = mapRows(data ?? []).find(item => item.id === submissionId);
  if (!row) return NextResponse.json({ error: "Sonuç bulunamadı." }, { status: 404 });

  const percent = Number(row.max_score) > 0 ? Math.round((Number(row.score) / Number(row.max_score)) * 100) : 0;
  const answerRows = row.answers.map((answer: any) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${htmlEscape(answer.prompt)}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${htmlEscape(answerText(answer.answer))}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${htmlEscape(correctAnswerText(answer.correct_answer))}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${answer.correct_answer == null ? "Gizli" : answer.is_correct ? "Doğru" : "Yanlış"}</td>
    </tr>
  `).join("");

  const result = await sendOwnerNotificationEmail({
    to: email,
    subject: `Sınav sonucunuz: ${row.qr_title}`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;">
        <div style="max-width:720px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:18px;padding:24px;">
          <p style="margin:0 0 6px;color:#7c3aed;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px;">QR Publish</p>
          <h1 style="margin:0 0 16px;color:#0f172a;">${htmlEscape(row.qr_title)}</h1>
          <p style="font-size:15px;color:#334155;">Puanınız: <strong>${htmlEscape(row.score)} / ${htmlEscape(row.max_score)} (${percent}%)</strong></p>
          <p style="font-size:15px;color:#334155;">Durum: <strong>${row.passed ? "Başarılı" : "Başarısız"}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:13px;color:#334155;">
            <thead><tr><th align="left">Soru</th><th align="left">Cevabınız</th><th align="left">Doğru Cevap</th><th align="left">Sonuç</th></tr></thead>
            <tbody>${answerRows}</tbody>
          </table>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
