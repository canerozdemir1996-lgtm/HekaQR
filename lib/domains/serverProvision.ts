import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFileCb);

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "provision-custom-domain.sh");

export type ProvisionResult = { ok: true } | { ok: false; error: string };

export type ExecFn = (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

const defaultExec: ExecFn = (file, args) => execFileAsync(file, args, { timeout: 120_000 });

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "stderr" in err) {
    const stderr = (err as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim()) return stderr.trim();
  }
  return err instanceof Error ? err.message : "unknown error";
}

/**
 * Doğrulanmış bir domain için nginx server block + Let's Encrypt sertifikası
 * kurar (scripts/provision-custom-domain.sh). Root yetkisi gerektirir.
 *
 * "-n" (non-interactive) ile çağrılıyor: gamedev kullanıcısına bu script
 * için NOPASSWD sudo izni verilmemişse, şifre istemek için askıda kalmak
 * yerine hemen "a password is required" hatasıyla döner. Best-effort —
 * hiçbir zaman throw etmez, isteği bloklamaz; başarısızlık DB'de
 * server_status="failed" + server_error olarak işaretlenir.
 */
export async function provisionCustomDomainOnServer(
  domain: string,
  execFn: ExecFn = defaultExec,
): Promise<ProvisionResult> {
  try {
    // Script doğrudan komut olarak çağrılıyor (bash üzerinden değil) — sudoers
    // NOPASSWD kuralı script'in tam yolunu komut olarak yetkilendiriyor;
    // "sudo bash <script>" çağrısında sudo'nun gördüğü komut "bash" olur ve
    // kural eşleşmez. Script zaten +x ve uygun shebang'a sahip.
    await execFn("sudo", ["-n", SCRIPT_PATH, domain]);
    return { ok: true };
  } catch (err) {
    const message = errorMessage(err).slice(0, 500);
    console.error("[provisionCustomDomainOnServer] failed", { domain, error: message });
    return { ok: false, error: message };
  }
}
