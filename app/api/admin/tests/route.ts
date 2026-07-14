import { spawn } from "node:child_process";
import { chmod, copyFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { adminTestCatalog, type AdminTestCatalogEntry } from "@/lib/generated-test-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TestType = AdminTestCatalogEntry["type"];

async function prepareEsbuildEnv(): Promise<Record<string, string>> {
  if (process.platform === "win32") return {};

  const packageName = `${process.platform}-${process.arch}`;
  const source = path.join(process.cwd(), "node_modules", "@esbuild", packageName, "bin", "esbuild");
  try {
    await chmod(source, 0o755);
    return { ESBUILD_BINARY_PATH: source };
  } catch {
    // Salt-okunur deployment'larda çalıştırılabilir bir geçici kopyaya düş.
  }
  const target = path.join(os.tmpdir(), `qrpublish-esbuild-${process.pid}-${packageName}`);
  await copyFile(source, target);
  await chmod(target, 0o755);
  return { ESBUILD_BINARY_PATH: target };
}

function runProcess(executable: string, args: string[], extraEnv: Record<string, string | undefined> = {}) {
  return new Promise<{ exitCode: number; output: string; durationMs: number }>((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv, CI: "1", FORCE_COLOR: "0", NO_COLOR: "1" },
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
    const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    const esbuildEnv = await prepareEsbuildEnv();
    return runProcess(process.execPath, [tsxCli, "--test", file ?? "tests/*.test.ts"], esbuildEnv);
  }

  const playwrightCli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
  const browserInstall = await runProcess(process.execPath, [playwrightCli, "install", "chromium"]);
  if (browserInstall.exitCode !== 0) {
    return {
      ...browserInstall,
      output: `Chromium test tarayıcısı kurulamadı.\n\n${browserInstall.output}`,
    };
  }
  const testRun = await runProcess(process.execPath, [playwrightCli, "test", ...(file ? [file] : [])], { E2E_BASE_URL: baseUrl });
  return {
    ...testRun,
    durationMs: browserInstall.durationMs + testRun.durationMs,
    output: [browserInstall.output, testRun.output].filter(Boolean).join("\n\n"),
  };
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

    const result = await runCommand(body.type, file, request.nextUrl.origin);
    return NextResponse.json({
      ok: result.exitCode === 0,
      type: body.type,
      file: file ?? null,
      ...result,
    }, { status: result.exitCode === 0 ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test çalıştırılamadı.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
