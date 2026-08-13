import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { isExamOpen, normalizeExamConfig, scoreExam, type ExamAnswerMap } from "@/lib/exam";
import {
  currentExamExtraTime,
  examDeadline,
  EXAM_EXTRA_TIME_EVENT_QUESTION_ID,
  isExamDeadlineExpired,
} from "@/lib/exam-extra-time";
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

function ipLock(req: NextRequest) {
  return crypto.createHash("sha256").update(clientIp(req)).digest("hex");
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
    .select("id,user_id,title,short_slug,is_active,qr_type,dynamic_content,webhook_url,updated_at")
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
  const attemptId = cleanText(body.attemptId, 120);
  const currentExamVersionSince = qr.updated_at ? new Date(qr.updated_at).toISOString() : null;
  if (config.singleAttempt) {
    let previousQuery = sbAdmin()
      .from("exam_submissions")
      .select("id,score,max_score,passed,submitted_at")
      .eq("qr_id", qr.id)
      .eq("attempt_fingerprint", fp)
      .in("status", ["submitted", "needs_review"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (currentExamVersionSince) previousQuery = previousQuery.gte("created_at", currentExamVersionSince);
    const { data: previous, error } = await previousQuery.maybeSingle();
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

  let authoritativeStartedAt = body.startedAt ? new Date(String(body.startedAt)) : new Date();
  let extraTimeMinutes = 0;
  if (attemptId) {
    const { data: attempt, error: attemptError } = await sbAdmin()
      .from("exam_submissions")
      .select("id,started_at,status,attempt_fingerprint")
      .eq("id", attemptId)
      .eq("qr_id", qr.id)
      .eq("attempt_fingerprint", fp)
      .eq("status", "in_progress")
      .maybeSingle();
    if (attemptError) return NextResponse.json({ error: safeDbErrorMessage(attemptError, "exam.SUBMIT.attempt") }, { status: 500 });
    if (!attempt) return NextResponse.json({ error: "Devam eden sınav oturumu bulunamadı.", code: "attempt_not_found" }, { status: 409 });
    authoritativeStartedAt = new Date(attempt.started_at);
    const { data: extraTimeRows, error: extraTimeError } = await sbAdmin()
      .from("exam_answers")
      .select("answer,created_at")
      .eq("submission_id", attempt.id)
      .eq("question_id", EXAM_EXTRA_TIME_EVENT_QUESTION_ID)
      .order("created_at", { ascending: false });
    if (extraTimeError) return NextResponse.json({ error: safeDbErrorMessage(extraTimeError, "exam.SUBMIT.extra_time") }, { status: 500 });
    extraTimeMinutes = currentExamExtraTime(extraTimeRows)?.minutes ?? 0;
  }

  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as ExamAnswerMap;
  const scoring = scoreExam(config, answers);
  const needsReview = config.questions.some(question => question.type === "essay");
  const submittedAt = new Date().toISOString();
  if (Number.isNaN(+authoritativeStartedAt)) authoritativeStartedAt = new Date();
  const elapsed = Math.max(0, Math.round((Date.now() - +authoritativeStartedAt) / 1000));
  const deadlineAt = examDeadline({
    startedAt: authoritativeStartedAt,
    timeLimitMinutes: config.timeLimitMinutes,
    extraTimeMinutes,
  });
  const expired = isExamDeadlineExpired(deadlineAt, new Date(), 15);

  const submissionPayload: Record<string, unknown> = {
      qr_id: qr.id,
      user_id: qr.user_id,
      participant,
      access_code: accessCode || null,
      started_at: authoritativeStartedAt.toISOString(),
      submitted_at: submittedAt,
      time_used_seconds: elapsed,
      score: scoring.score,
      max_score: scoring.maxScore,
      correct_count: scoring.correctCount,
      wrong_count: scoring.wrongCount,
      blank_count: scoring.blankCount,
      passed: scoring.passed,
      status: expired ? "expired" : needsReview ? "needs_review" : "submitted",
      attempt_fingerprint: fp,
      ip_lock_hash: ipLock(req),
  };

  const persistSubmission = (payload: Record<string, unknown>) => attemptId
    ? sbAdmin()
      .from("exam_submissions")
      .update(payload)
      .eq("id", attemptId)
      .eq("qr_id", qr.id)
      .eq("attempt_fingerprint", fp)
      .eq("status", "in_progress")
      .select("*")
      .single()
    : sbAdmin()
      .from("exam_submissions")
      .insert(payload)
      .select("*")
      .single();

  let submissionResult = await persistSubmission(submissionPayload);
  if (submissionResult.error && isSchemaCompatError(submissionResult.error) && "ip_lock_hash" in submissionPayload) {
    delete submissionPayload.ip_lock_hash;
    submissionResult = await persistSubmission(submissionPayload);
  }
  if (submissionResult.error && submissionResult.error.code === "23514" && submissionPayload.status === "needs_review") {
    submissionPayload.status = "submitted";
    submissionResult = await persistSubmission(submissionPayload);
  }

  const submission = submissionResult.data;
  const insertError = submissionResult.error;
  if (insertError) return NextResponse.json({ error: safeDbErrorMessage(insertError, "exam.SUBMIT.insert", "Sınav sonucu kaydedilemedi.") }, { status: 500 });
  if (!submission) return NextResponse.json({ error: "Sınav sonucu kaydedilemedi." }, { status: 500 });

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
      status: expired ? submission.status : needsReview ? "needs_review" : submission.status,
      answers: config.showQuestionSummary ? scoring.answers.map(({ correctAnswer: _correctAnswer, ...answer }) => answer) : [],
    },
  });
}
