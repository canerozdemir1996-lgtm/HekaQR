import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isExamOpen, normalizeExamConfig } from "@/lib/exam";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function fingerprint(req: NextRequest) {
  return crypto.createHash("sha256").update(`${clientIp(req)}:${req.headers.get("user-agent") ?? ""}`).digest("hex");
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
    .select("id,user_id,title,is_active,qr_type,dynamic_content")
    .eq("short_slug", slug.toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`exam_start:${ip}`, RATE_LIMITS.FEEDBACK_SUBMIT.max, RATE_LIMITS.FEEDBACK_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const slug = cleanText(body.slug, 160).toLowerCase();
  if (!slug) return NextResponse.json({ error: "Sınav bulunamadı." }, { status: 404 });

  const { data: qr, error: qrError } = await findQr(slug);
  if (qrError) return NextResponse.json({ error: safeDbErrorMessage(qrError, "exam.START.lookup") }, { status: 500 });
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

  const participant = participantFrom(body.participant);
  if (config.participantFields.name && !participant.name) return NextResponse.json({ error: "Ad soyad zorunlu." }, { status: 400 });
  if (config.participantFields.email && !participant.email) return NextResponse.json({ error: "E-posta zorunlu." }, { status: 400 });
  if (config.participantFields.studentNo && !participant.studentNo) return NextResponse.json({ error: "Öğrenci numarası zorunlu." }, { status: 400 });

  const fp = fingerprint(req);
  if (config.singleAttempt) {
    const { data: previous, error } = await sbAdmin()
      .from("exam_submissions")
      .select("id,score,max_score,passed,submitted_at,status")
      .eq("qr_id", qr.id)
      .eq("attempt_fingerprint", fp)
      .in("status", ["submitted", "needs_review"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && !isSchemaCompatError(error)) {
      return NextResponse.json({ error: safeDbErrorMessage(error, "exam.START.previous") }, { status: 500 });
    }
    if (previous) {
      return NextResponse.json({ error: "Bu cihazdan sınav daha önce tamamlandı.", code: "single_attempt", submission: previous }, { status: 409 });
    }
  }

  const lock = ipLock(req);
  let ipLockSupported = true;
  const lockWindowMinutes = Math.max(15, config.timeLimitMinutes > 0 ? config.timeLimitMinutes + 10 : 180);
  const activeSince = new Date(Date.now() - lockWindowMinutes * 60_000).toISOString();
  const { data: active, error: activeError } = await sbAdmin()
    .from("exam_submissions")
    .select("id,created_at")
    .eq("qr_id", qr.id)
    .eq("ip_lock_hash", lock)
    .eq("status", "in_progress")
    .gte("created_at", activeSince)
    .limit(1)
    .maybeSingle();
  if (activeError) {
    if (isSchemaCompatError(activeError)) ipLockSupported = false;
    else return NextResponse.json({ error: safeDbErrorMessage(activeError, "exam.START.ip") }, { status: 500 });
  }
  if (active) {
    return NextResponse.json({ error: "Bu IP adresinden devam eden bir sınav var. Aynı anda ikinci oturum açılamaz.", code: "ip_in_use" }, { status: 409 });
  }

  const startedAt = body.startedAt ? new Date(String(body.startedAt)) : new Date();
  const attemptPayload: Record<string, unknown> = {
    qr_id: qr.id,
    user_id: qr.user_id,
    participant,
    access_code: accessCode || null,
    started_at: Number.isNaN(+startedAt) ? new Date().toISOString() : startedAt.toISOString(),
    status: "in_progress",
    attempt_fingerprint: fp,
  };
  if (ipLockSupported) attemptPayload.ip_lock_hash = lock;

  let insertResult = await sbAdmin()
    .from("exam_submissions")
    .insert(attemptPayload)
    .select("id,started_at,status")
    .single();

  if (insertResult.error && isSchemaCompatError(insertResult.error) && "ip_lock_hash" in attemptPayload) {
    delete attemptPayload.ip_lock_hash;
    insertResult = await sbAdmin()
      .from("exam_submissions")
      .insert(attemptPayload)
      .select("id,started_at,status")
      .single();
  }

  const { data: attempt, error: insertError } = insertResult;
  if (insertError) return NextResponse.json({ error: safeDbErrorMessage(insertError, "exam.START.insert", "Sınav başlatılamadı.") }, { status: 500 });
  return NextResponse.json({ attempt }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
