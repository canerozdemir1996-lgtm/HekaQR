import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { isExamOpen, normalizeExamConfig, scoreExam, type ExamAnswerMap } from "@/lib/exam";
import { isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function fingerprint(req: NextRequest) {
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  return crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex");
}

function participantFrom(value: unknown) {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    name: cleanText(raw.name, 160),
    email: cleanText(raw.email, 180),
    studentNo: cleanText(raw.studentNo, 120),
  };
}

async function findQr(slug: string) {
  return sbAdmin()
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,qr_type,dynamic_content,webhook_url")
    .eq("short_slug", slug.toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`exam_submit:${ip}`, RATE_LIMITS.FEEDBACK_SUBMIT.max, RATE_LIMITS.FEEDBACK_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const slug = cleanText(body.slug, 160).toLowerCase();
  if (!slug) return NextResponse.json({ error: "Sınav bulunamadı." }, { status: 404 });

  const { data: qr, error: qrError } = await findQr(slug);
  if (qrError) return NextResponse.json({ error: safeDbErrorMessage(qrError, "exam.SUBMIT.lookup") }, { status: 500 });
  if (!qr || qr.is_active === false || (qr.qr_type !== "quiz" && qr.dynamic_content?.kind !== "exam")) {
    return NextResponse.json({ error: "Sınav aktif değil veya bulunamadı." }, { status: 404 });
  }

  const config = normalizeExamConfig(qr.dynamic_content, qr.title);
  const open = isExamOpen(config);
  if (!open.open) {
    return NextResponse.json({ error: open.reason === "not_started" ? "Sınav henüz başlamadı." : "Sınav kapandı.", code: open.reason }, { status: 409 });
  }

  const accessCode = cleanText(body.accessCode, 120);
  if (config.access.mode === "password" && accessCode !== config.access.password) {
    return NextResponse.json({ error: "Sınav parolası hatalı.", code: "bad_access" }, { status: 403 });
  }
  if ((config.access.mode === "code" || config.access.mode === "one_time") && !config.access.codes.includes(accessCode)) {
    return NextResponse.json({ error: "Giriş kodu geçersiz.", code: "bad_access" }, { status: 403 });
  }

  const fp = fingerprint(req);
  if (config.singleAttempt) {
    const { data: previous, error } = await sbAdmin()
      .from("exam_submissions")
      .select("id,score,max_score,passed,submitted_at")
      .eq("qr_id", qr.id)
      .eq("attempt_fingerprint", fp)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && !isSchemaCompatError(error)) {
      return NextResponse.json({ error: safeDbErrorMessage(error, "exam.SUBMIT.previous") }, { status: 500 });
    }
    if (previous) {
      return NextResponse.json({ error: "Bu cihazdan sınav daha önce tamamlandı.", code: "single_attempt", submission: previous }, { status: 409 });
    }
  }

  if (config.access.mode === "one_time") {
    const { data: used, error } = await sbAdmin()
      .from("exam_submissions")
      .select("id")
      .eq("qr_id", qr.id)
      .eq("access_code", accessCode)
      .eq("status", "submitted")
      .limit(1)
      .maybeSingle();
    if (error && !isSchemaCompatError(error)) {
      return NextResponse.json({ error: safeDbErrorMessage(error, "exam.SUBMIT.code") }, { status: 500 });
    }
    if (used) return NextResponse.json({ error: "Bu tek kullanımlık kod daha önce kullanıldı.", code: "code_used" }, { status: 409 });
  }

  const participant = participantFrom(body.participant);
  if (config.participantFields.name && !participant.name) return NextResponse.json({ error: "Ad soyad zorunlu." }, { status: 400 });
  if (config.participantFields.email && !participant.email) return NextResponse.json({ error: "E-posta zorunlu." }, { status: 400 });
  if (config.participantFields.studentNo && !participant.studentNo) return NextResponse.json({ error: "Öğrenci numarası zorunlu." }, { status: 400 });

  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as ExamAnswerMap;
  const scoring = scoreExam(config, answers);
  const submittedAt = new Date().toISOString();
  const startedAt = body.startedAt ? new Date(String(body.startedAt)) : new Date();
  const elapsed = Math.max(0, Math.round(Number(body.elapsedSeconds) || ((Date.now() - +startedAt) / 1000)));
  const expired = config.timeLimitMinutes > 0 && elapsed > config.timeLimitMinutes * 60 + 15;

  const { data: submission, error: insertError } = await sbAdmin()
    .from("exam_submissions")
    .insert({
      qr_id: qr.id,
      user_id: qr.user_id,
      participant,
      access_code: accessCode || null,
      started_at: Number.isNaN(+startedAt) ? submittedAt : startedAt.toISOString(),
      submitted_at: submittedAt,
      time_used_seconds: elapsed,
      score: scoring.score,
      max_score: scoring.maxScore,
      correct_count: scoring.correctCount,
      wrong_count: scoring.wrongCount,
      blank_count: scoring.blankCount,
      passed: scoring.passed,
      status: expired ? "expired" : "submitted",
      attempt_fingerprint: fp,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: safeDbErrorMessage(insertError, "exam.SUBMIT.insert", "Sınav sonucu kaydedilemedi.") }, { status: 500 });

  const answerRows = scoring.answers.map(answer => ({
    submission_id: submission.id,
    question_id: answer.questionId,
    answer: answer.answer,
    correct_answer: answer.correctAnswer,
    is_correct: answer.isCorrect,
    points: answer.points,
  }));
  const { error: answersError } = await sbAdmin().from("exam_answers").insert(answerRows);
  if (answersError && !isSchemaCompatError(answersError)) {
    console.error("[exam.SUBMIT.answers] database error", { message: answersError.message, code: answersError.code });
  }

  void dispatchWebhook(qr.webhook_url, {
    type: "exam.submitted",
    qrId: qr.id,
    qrSlug: qr.short_slug,
    data: {
      submission_id: submission.id,
      participant,
      score: scoring.score,
      max_score: scoring.maxScore,
      passed: scoring.passed,
    },
  });

  return NextResponse.json({
    submission: {
      id: submission.id,
      submitted_at: submission.submitted_at,
      time_used_seconds: submission.time_used_seconds,
      score: scoring.score,
      max_score: scoring.maxScore,
      correct_count: scoring.correctCount,
      wrong_count: scoring.wrongCount,
      blank_count: scoring.blankCount,
      passed: scoring.passed,
      answers: config.showQuestionSummary ? scoring.answers.map(({ correctAnswer: _correctAnswer, ...answer }) => answer) : [],
    },
  });
}
