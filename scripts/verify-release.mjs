import { spawnSync } from "node:child_process";

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const checks = [
  ["Non-interactive ESLint", ["run", "lint"]],
  ["TypeScript", ["run", "typecheck"]],
  ["Unit ve integration", ["test"]],
  ["Production build", ["run", "build"]],
];

if (process.env.RELEASE_E2E === "1") {
  checks.splice(3, 0, ["Kritik Playwright E2E", ["run", "test:e2e:critical"]]);
}

for (const [label, args] of checks) {
  process.stdout.write(`\n[release] ${label}\n`);
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(npmCommand, commandArgs, {
    cwd: process.cwd(),
    env: { ...process.env, CI: process.env.CI || "1" },
    shell: !npmExecPath && process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(`[release] BAŞARISIZ: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

if (process.env.RELEASE_E2E !== "1") {
  process.stdout.write("\n[release] E2E koşul nedeniyle çalıştırılmadı. Canlı test verisiyle RELEASE_E2E=1 ayarlayın.\n");
}
process.stdout.write("\n[release] Tüm zorunlu kontroller geçti.\n");
