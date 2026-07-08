import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mfaAdminClient: ReturnType<typeof createClient<any>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMfaAdminClient(): ReturnType<typeof createClient<any>> {
  if (!mfaAdminClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mfaAdminClient = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return mfaAdminClient;
}

// ─────────────────────────────────────────────────────────────
// TOTP (Time-based One-Time Password) Service
// ─────────────────────────────────────────────────────────────
export async function generateTOTPSecret(email: string) {
  try {
    const secret = speakeasy.generateSecret({
      name: `QR Publish (${email})`,
      issuer: "QR Publish",
      length: 32,
    });

    // QR Code generate et
    const qrCode = await (QRCode as any).toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode,
      manual: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  } catch (error) {
    console.error("TOTP generation error:", error);
    throw new Error("Failed to generate TOTP secret");
  }
}

// TOTP Token verify et (6 haneli code)
export function verifyTOTPToken(secret: string, token: string): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2, // ±2 time windows (30 seconds each) = ±60 seconds tolerance
    });

    return verified;
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Backup Codes Service
// ─────────────────────────────────────────────────────────────
export async function generateBackupCodes(count: number = 10): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX-XXXX (12 random hex chars)
    const code = crypto
      .randomBytes(6)
      .toString("hex")
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join("-");

    if (code) codes.push(code);
  }

  return codes;
}

// Backup code hash et (storage için)
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// ─────────────────────────────────────────────────────────────
// MFA Setup & Verification
// ─────────────────────────────────────────────────────────────

export async function setupMFA(
  userId: string,
  email: string
): Promise<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}> {
  try {
    const supabase = getMfaAdminClient();
    // Existing MFA check — sadece doğrulanmış (aktif) kurulum varsa engelle.
    // Yarım kalmış (doğrulanmamış) bir kurulum varsa temizleyip yeniden başlatılabilir,
    // aksi halde kullanıcı sayfayı kapatıp tekrar denediğinde kalıcı olarak kilitlenir.
    const { data: existing } = await supabase
      .from("user_mfa_settings")
      .select("id, verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.verified) {
      throw new Error("MFA already setup for this user");
    }
    if (existing) {
      await supabase.from("user_mfa_settings").delete().eq("user_id", userId);
      await supabase.from("mfa_backup_codes").delete().eq("user_id", userId);
    }

    // Generate TOTP
    const { secret, qrCode } = await generateTOTPSecret(email);

    // Generate backup codes
    const backupCodes = await generateBackupCodes(10);
    const hashedCodes = backupCodes.map((code) => hashCode(code));

    // Insert settings (unverified)
    const { error: settingsError } = await supabase
      .from("user_mfa_settings")
      .insert({
        user_id: userId,
        totp_secret: secret,
        totp_verified: false,
        mfa_enabled: false,
        verified: false,
      });

    if (settingsError) throw settingsError;

    // Insert backup codes
    const backupCodeRecords = hashedCodes.map((hash) => ({
      user_id: userId,
      code_hash: hash,
      used: false,
    }));

    const { error: codesError } = await supabase
      .from("mfa_backup_codes")
      .insert(backupCodeRecords);

    if (codesError) throw codesError;

    // Log
    await logMFAAudit(userId, "totp_generated", "success");

    return {
      secret,
      qrCode,
      backupCodes, // Only return once - user must save them
    };
  } catch (error) {
    console.error("MFA setup error:", error);
    throw error;
  }
}

export async function verifyMFASetup(
  userId: string,
  totpCode: string
): Promise<boolean> {
  try {
    const supabase = getMfaAdminClient();
    // Get MFA settings
    const { data: mfaSettings } = await supabase
      .from("user_mfa_settings")
      .select("totp_secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mfaSettings?.totp_secret) {
      throw new Error("MFA not setup");
    }

    // Verify TOTP
    const isValid = verifyTOTPToken(mfaSettings.totp_secret, totpCode);

    if (!isValid) {
      await logMFAAudit(userId, "totp_verified", "failure", "Invalid TOTP code");
      return false;
    }

    // Mark as verified
    const { error } = await supabase
      .from("user_mfa_settings")
      .update({
        totp_verified: true,
        mfa_enabled: true,
        verified: true,
      })
      .eq("user_id", userId);

    if (error) throw error;

    await logMFAAudit(userId, "totp_verified", "success");
    return true;
  } catch (error) {
    console.error("MFA verification error:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// MFA Authentication
// ─────────────────────────────────────────────────────────────

export async function validateMFACode(userId: string, code: string): Promise<boolean> {
  try {
    const supabase = getMfaAdminClient();
    const { data: mfaSettings } = await supabase
      .from("user_mfa_settings")
      .select("totp_secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mfaSettings?.totp_secret) {
      return false;
    }

    // Try TOTP first
    if (verifyTOTPToken(mfaSettings.totp_secret, code)) {
      await logMFAAudit(userId, "totp_verified", "success");
      return true;
    }

    // Try backup code
    if (code.includes("-") && code.length === 14) {
      const codeHash = hashCode(code);

      const { data: backupCode } = await supabase
        .from("mfa_backup_codes")
        .select("id, used")
        .eq("user_id", userId)
        .eq("code_hash", codeHash)
        .maybeSingle();

      if (backupCode && !backupCode.used) {
        // Mark as used
        await supabase
          .from("mfa_backup_codes")
          .update({ used: true, used_at: new Date().toISOString() })
          .eq("id", backupCode.id);

        await logMFAAudit(userId, "backup_code_used", "success");
        return true;
      }

      if (backupCode?.used) {
        await logMFAAudit(userId, "backup_code_used", "failure", "Code already used");
        return false;
      }
    }

    await logMFAAudit(userId, "totp_verified", "failure", "Invalid code");
    return false;
  } catch (error) {
    console.error("MFA validation error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// MFA Management
// ─────────────────────────────────────────────────────────────

export async function disableMFA(userId: string): Promise<void> {
  try {
    const supabase = getMfaAdminClient();
    const { error } = await supabase
      .from("user_mfa_settings")
      .update({
        mfa_enabled: false,
        verified: false,
        totp_secret: null,
      })
      .eq("user_id", userId);

    if (error) throw error;

    // Delete backup codes
    await supabase.from("mfa_backup_codes").delete().eq("user_id", userId);

    await logMFAAudit(userId, "mfa_disabled", "success");
  } catch (error) {
    console.error("MFA disable error:", error);
    throw error;
  }
}

export async function getMFAStatus(userId: string) {
  try {
    const supabase = getMfaAdminClient();
    const { data } = await supabase
      .from("user_mfa_settings")
      .select("mfa_enabled, verified, mfa_method")
      .eq("user_id", userId)
      .maybeSingle();

    return data;
  } catch (error) {
    console.error("MFA status error:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Audit Logging
// ─────────────────────────────────────────────────────────────

export async function logMFAAudit(
  userId: string,
  eventType: string,
  status: "success" | "failure" = "success",
  reason?: string
): Promise<void> {
  try {
    const supabase = getMfaAdminClient();
    await supabase.from("mfa_audit_logs").insert({
      user_id: userId,
      event_type: eventType,
      status,
      reason,
      ip_address: null, // Request context'ten alınabilir
      user_agent: null,
    });
  } catch (error) {
    console.error("Audit log error:", error);
    // Don't throw - logging failures shouldn't break auth
  }
}

export async function getMFAAuditLogs(userId: string, limit: number = 50) {
  try {
    const supabase = getMfaAdminClient();
    const { data } = await supabase
      .from("mfa_audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    console.error("Get audit logs error:", error);
    return [];
  }
}
