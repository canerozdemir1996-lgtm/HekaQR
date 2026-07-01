import { NextRequest, NextResponse } from "next/server";
import { authRequest, isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: any[]) {
  const headers = ["exam", "participant", "email", "student_no", "submitted_at", "time_used_seconds", "score", "max_score", "percent", "passed"];
  const lines = rows.map(row => {
    const participant = row.participant ?? {};
    const percent = Number(row.max_score) > 0 ? Math.round((Number(row.score) / Number(row.max_score)) * 100) : 0;
    return [
      row.qr_title,
      participant.name,
      participant.email,
      participant.studentNo,
      row.submitted_at,
      row.time_used_seconds,
      row.score,
      row.max_score,
      percent,
      row.passed ? "passed" : "failed",
    ].map(csvCell).join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

function summarize(rows: any[]) {
  const total = rows.length;
  const passed = rows.filter(row => row.passed).length;
  const avgPercent = total
    ? Math.round(rows.reduce((sum, row) => sum + (Number(row.max_score) > 0 ? (Number(row.score) / Number(row.max_score)) * 100 : 0), 0) / total)
    : 0;
  const byQuestion: Record<string, { questionId: string; correct: number; total: number; points: number }> = {};
  for (const row of rows) {
    for (const answer of row.answers ?? []) {
      const key = answer.question_id;
      byQuestion[key] ??= { questionId: key, correct: 0, total: 0, points: 0 };
      byQuestion[key].total += 1;
      byQuestion[key].points += Number(answer.points ?? 0);
      if (answer.is_correct) byQuestion[key].correct += 1;
    }
  }
  return {
    total,
    passed,
    failed: total - passed,
    passRate: total ? Math.round((passed / total) * 100) : 0,
    avgPercent,
    questionAnalysis: Object.values(byQuestion).map(item => ({
      ...item,
      correctRate: item.total ? Math.round((item.correct / item.total) * 100) : 0,
    })),
  };
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const qrId = req.nextUrl.searchParams.get("qr_id");
  const passed = req.nextUrl.searchParams.get("passed");
  const search = String(req.nextUrl.searchParams.get("search") ?? "").trim().toLocaleLowerCase("tr-TR");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const exportCsv = req.nextUrl.searchParams.get("export") === "csv";

  let query = sbAdmin()
    .from("exam_submissions")
    .select("*, qr_codes!inner(id,title,short_slug,user_id,qr_type,dynamic_content), exam_answers(*)")
    .eq("qr_codes.user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (qrId) query = query.eq("qr_id", qrId);
  if (passed === "true") query = query.eq("passed", true);
  if (passed === "false") query = query.eq("passed", false);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) {
    if (isSchemaCompatError(error)) return NextResponse.json({ submissions: [], summary: summarize([]), exams: [] });
    return NextResponse.json({ error: safeDbErrorMessage(error, "exam.REPORT.list") }, { status: 500 });
  }

  const rows = (data ?? [])
    .map(row => ({
      ...row,
      qr_title: row.qr_codes?.title ?? "Sınav",
      qr_slug: row.qr_codes?.short_slug ?? "",
      answers: row.exam_answers ?? [],
    }))
    .filter(row => {
      if (!search) return true;
      const p = row.participant ?? {};
      return [row.qr_title, p.name, p.email, p.studentNo].some(value => String(value ?? "").toLocaleLowerCase("tr-TR").includes(search));
    });

  if (exportCsv) {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam-results-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const examMap = new Map<string, { id: string; title: string; slug: string; submissions: number }>();
  for (const row of rows) {
    const current = examMap.get(row.qr_id) ?? { id: row.qr_id, title: row.qr_title, slug: row.qr_slug, submissions: 0 };
    current.submissions += 1;
    examMap.set(row.qr_id, current);
  }

  return NextResponse.json({
    submissions: rows.map(row => ({
      id: row.id,
      qr_id: row.qr_id,
      qr_title: row.qr_title,
      qr_slug: row.qr_slug,
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
      answers: row.answers,
    })),
    summary: summarize(rows),
    exams: Array.from(examMap.values()),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
