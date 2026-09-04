import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { normalizeExamConfig } from "@/lib/exam";
import {
  buildExamExtraTimeEvent,
  currentExamExtraTime,
  examDeadline,
  EXAM_EXTRA_TIME_EVENT_QUESTION_ID,
  MAX_EXAM_EXTRA_TIME_MINUTES,
} from "@/lib/exam-extra-time";
import { clientIp } from "@/lib/rateLimit";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function fingerprint(req: NextRequest) {
  return crypto.createHash("sha256").update(`${clientIp(req)}:${req.headers.get("user-agent") ?? ""}`).digest("hex");
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const slug = String(req.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!id || !slug) return NextResponse.json({ error: "Sonuç bulunamadı." }, { status: 404 });

  const { data, error } = await sbAdmin()
    .from("exam_submissions")
    .select("id,qr_id,participant,started_at,submitted_at,time_used_seconds,score,max_score,correct_count,wrong_count,blank_count,passed,status,attempt_fingerprint,qr_codes!inner(short_slug,title,dynamic_content)")
    .eq("id", id)
    .eq("qr_codes.short_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "exam.RESULT.lookup") }, { status: 500 });
  if (!data || data.attempt_fingerprint !== fingerprint(req)) return NextResponse.json({ error: "Sonuç bulunamadı." }, { status: 404 });

  if (data.status === "in_progress") {
    const { data: extraTimeRows, error: extraTimeError } = await sbAdmin()
      .from("exam_answers")
      .select("answer,created_at")
      .eq("submission_id", data.id)
      .eq("question_id", EXAM_EXTRA_TIME_EVENT_QUESTION_ID)
      .order("created_at", { ascending: false });
    if (extraTimeError) return NextResponse.json({ error: safeDbErrorMessage(extraTimeError, "exam.DEADLINE.lookup") }, { status: 500 });
    const extraTime = currentExamExtraTime(extraTimeRows);
    const qrCode = Array.isArray(data.qr_codes) ? data.qr_codes[0] : data.qr_codes;
    const config = normalizeExamConfig(qrCode?.dynamic_content, qrCode?.title ?? "Sınav");
    const deadlineAt = examDeadline({
      startedAt: data.started_at,
      timeLimitMinutes: config.timeLimitMinutes,
      extraTimeMinutes: extraTime?.minutes ?? 0,
    });
    return NextResponse.json({
      attempt: {
        id: data.id,
        status: data.status,
        started_at: data.started_at,
        deadline_at: deadlineAt,
        extra_time_minutes: extraTime?.minutes ?? 0,
        total_duration_seconds: config.timeLimitMinutes > 0 ? (config.timeLimitMinutes + (extraTime?.minutes ?? 0)) * 60 : 0,
        server_now: new Date().toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const grades = Array.isArray(body.grades) ? body.grades : [];
  const finalize = body.finalize === true;

  const { data: submission, error } = await sbAdmin()
    .from("exam_submissions")
    .select("id,qr_id,participant,started_at,status,qr_codes!inner(id,title,user_id,dynamic_content)")
    .eq("id", id)
    .eq("qr_codes.user_id", auth.userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "exam.GRADE.lookup") }, { status: 500 });
  if (!submission) return NextResponse.json({ error: "Sonuç bulunamadı." }, { status: 404 });

  const qrCode = Array.isArray(submission.qr_codes) ? submission.qr_codes[0] : submission.qr_codes;
  const config = normalizeExamConfig(qrCode?.dynamic_content, qrCode?.title ?? "Sınav");
  if (Object.prototype.hasOwnProperty.call(body, "extraTimeMinutes")) {
    if (submission.status !== "in_progress") {
      return NextResponse.json({ error: "Ek süre yalnız devam eden sınavlara verilebilir." }, { status: 409 });
    }
    const minutes = Number(body.extraTimeMinutes);
    const reason = String(body.extraTimeReason ?? "").trim().slice(0, 500);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_EXAM_EXTRA_TIME_MINUTES) {
      return NextResponse.json({ error: `Ek süre 0-${MAX_EXAM_EXTRA_TIME_MINUTES} arasında tam sayı olmalıdır.` }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ error: "Ek süre değişiklik nedeni zorunludur." }, { status: 400 });

    const { data: existingRows, error: existingError } = await sbAdmin()
      .from("exam_answers")
      .select("answer,created_at")
      .eq("submission_id", submission.id)
      .eq("question_id", EXAM_EXTRA_TIME_EVENT_QUESTION_ID)
      .order("created_at", { ascending: false });
    if (existingError) return NextResponse.json({ error: safeDbErrorMessage(existingError, "exam.EXTRA_TIME.current") }, { status: 500 });
    const previous = currentExamExtraTime(existingRows);
    const event = buildExamExtraTimeEvent({
      minutes,
      previousMinutes: previous?.minutes ?? 0,
      reason,
      actorId: auth.userId,
    });
    const { error: auditError } = await sbAdmin().from("exam_answers").insert({
      submission_id: submission.id,
      question_id: EXAM_EXTRA_TIME_EVENT_QUESTION_ID,
      answer: event,
      correct_answer: "__system_event__",
      is_correct: false,
      points: 0,
    });
    if (auditError) return NextResponse.json({ error: safeDbErrorMessage(auditError, "exam.EXTRA_TIME.audit") }, { status: 500 });

    const deadlineAt = examDeadline({
      startedAt: submission.started_at,
      timeLimitMinutes: config.timeLimitMinutes,
      extraTimeMinutes: event.minutes,
    });
    return NextResponse.json({
      extraTime: event,
      deadline_at: deadlineAt,
      total_duration_seconds: config.timeLimitMinutes > 0 ? (config.timeLimitMinutes + event.minutes) * 60 : 0,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const questionMap = new Map(config.questions.map(question => [question.id, question]));
  const normalizedGrades = grades
    .map((grade: any) => {
      const questionId = String(grade?.questionId ?? "").trim();
      const question = questionMap.get(questionId);
      if (!question) return null;
      const max = Number(question.points ?? 0);
      const points = Math.max(0, Math.min(max, Number(grade?.points) || 0));
      return { questionId, points, isCorrect: points > 0 };
    })
    .filter(Boolean) as Array<{ questionId: string; points: number; isCorrect: boolean }>;

  for (const grade of normalizedGrades) {
    const { error: answerError } = await sbAdmin()
      .from("exam_answers")
      .update({ points: grade.points, is_correct: grade.isCorrect, correct_answer: finalize ? "__manual_final__" : "__manual_draft__" })
      .eq("submission_id", submission.id)
      .eq("question_id", grade.questionId);
    if (answerError) return NextResponse.json({ error: safeDbErrorMessage(answerError, "exam.GRADE.answer") }, { status: 500 });
  }

  const { data: answers, error: answersError } = await sbAdmin()
    .from("exam_answers")
    .select("question_id,answer,points,is_correct,correct_answer")
    .eq("submission_id", submission.id);
  if (answersError) return NextResponse.json({ error: safeDbErrorMessage(answersError, "exam.GRADE.answers") }, { status: 500 });

  const maxScore = config.questions.reduce((sum, question) => sum + Number(question.points ?? 0), 0);
  const gradeAnswers = (answers ?? []).filter(answer => answer.question_id !== EXAM_EXTRA_TIME_EVENT_QUESTION_ID);
  const score = gradeAnswers.reduce((sum, answer) => sum + Number(answer.points ?? 0), 0);
  const blankCount = config.questions.filter(question => {
    const answer = gradeAnswers.find(item => item.question_id === question.id)?.answer;
    return Array.isArray(answer) ? answer.length === 0 : !String(answer ?? "").trim();
  }).length;
  const correctCount = gradeAnswers.filter(answer => answer.is_correct).length;
  const wrongCount = Math.max(0, config.questions.length - blankCount - correctCount);
  const passed = maxScore > 0 ? (score / maxScore) * 100 >= config.passScore : false;

  const updatePayload = {
    score,
    max_score: maxScore,
    correct_count: correctCount,
    wrong_count: wrongCount,
    blank_count: blankCount,
    passed,
    status: finalize ? "submitted" : "needs_review",
  };

  let updateResult = await sbAdmin()
    .from("exam_submissions")
    .update(updatePayload)
    .eq("id", submission.id)
    .select("id,score,max_score,correct_count,wrong_count,blank_count,passed,status")
    .single();

  if (updateResult.error?.code === "23514" && updatePayload.status === "needs_review") {
    updateResult = await sbAdmin()
      .from("exam_submissions")
      .update({ ...updatePayload, status: "submitted" })
      .eq("id", submission.id)
      .select("id,score,max_score,correct_count,wrong_count,blank_count,passed,status")
      .single();
  }

  const { data: updated, error: updateError } = updateResult;
  if (updateError) return NextResponse.json({ error: safeDbErrorMessage(updateError, "exam.GRADE.update") }, { status: 500 });
  return NextResponse.json({
    submission: {
      ...updated,
      status: finalize ? "submitted" : "needs_review",
    },
    answers: gradeAnswers,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
