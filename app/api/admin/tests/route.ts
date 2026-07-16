import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { adminTestCatalog, type AdminTestCatalogEntry } from "@/lib/generated-test-catalog";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TestType = AdminTestCatalogEntry["type"];
type TestSummary = { passed: number; failed: number; skipped: number; total: number };

function readCount(output: string, labels: string[]) {
  for (const label of labels) {
    const tap = output.match(new RegExp(`(?:^|\\n)(?:#|ℹ)?\\s*${label}\\s+(\\d+)`, "i"));
    if (tap) return Number(tap[1]);
    const playwright = output.match(new RegExp(`(\\d+)\\s+${label}`, "i"));
    if (playwright) return Number(playwright[1]);
  }
  return 0;
}

function summarize(output: string, exitCode: number): TestSummary {
  const passed = readCount(output, ["pass", "passed"]);
  const failed = readCount(output, ["fail", "failed"]) || (exitCode === 0 ? 0 : 1);
  const skipped = readCount(output, ["skipped", "skip"]);
  const reportedTotal = readCount(output, ["tests"]);
  return { passed, failed, skipped, total: reportedTotal || passed + failed + skipped };
}

function unitBundlePath(file: string) {
  return path.join(process.cwd(), ".test-bundles", path.basename(file).replace(/\.ts$/, ".js"));
}

function runProcess(executable: string, args: string[], extraEnv: Record<string, string | undefined> = {}) {
  return new Promise<{ exitCode: number; output: string; durationMs: number }>((resolve, reject) => {
    const startedAt = Date.now();
    const env = { ...process.env, ...extraEnv, CI: "1" } as NodeJS.ProcessEnv;
    delete (env as Record<string, string | undefined>).FORCE_COLOR;
    delete (env as Record<string, string | undefined>).NO_COLOR;
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env,
      windowsHide: true,
    });
    let output = "";
    const append = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.length > 120_000) output = output.slice(-120_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => child.kill(), 290_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, output: output.trim(), durationMs: Date.now() - startedAt });
    });
  });
}

async function runCommand(type: TestType, file: string | undefined, baseUrl: string) {
  if (type === "unit") {
    const files = file
      ? [unitBundlePath(file)]
      : adminTestCatalog.filter((entry) => entry.type === "unit").map((entry) => unitBundlePath(entry.file));
    return runProcess(process.execPath, ["--test", ...files]);
  }

  const smokeTest = path.join(process.cwd(), "scripts", "admin-e2e-smoke.mjs");
  const testArgs = ["--test", smokeTest];
  const testEnv = { E2E_BASE_URL: baseUrl, PLAYWRIGHT_ADMIN_RUN: "1" };
  return runProcess(process.execPath, testArgs, testEnv);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminOrOwner(request);
    const body = await request.json().catch(() => null) as { type?: unknown; file?: unknown } | null;
    if (body?.type !== "unit" && body?.type !== "e2e") {
      return NextResponse.json({ error: "Geçersiz test türü." }, { status: 400 });
    }
    const file = typeof body.file === "string" ? body.file : undefined;
    if (file && !adminTestCatalog.some((entry) => entry.file === file && entry.type === body.type)) {
      return NextResponse.json({ error: "Test dosyası katalogda bulunamadı." }, { status: 400 });
    }

    const result = await runCommand(body.type, file, getPublicAppOrigin(request.nextUrl.origin));
    return NextResponse.json({
      ok: result.exitCode === 0,
      type: body.type,
      file: file ?? null,
      summary: summarize(result.output, result.exitCode),
      ...result,
    }, { status: result.exitCode === 0 ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test çalıştırılamadı.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
