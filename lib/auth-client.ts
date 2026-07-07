"use client";

import { getSupabase } from "@/lib/supabase";

export type CredentialsSignInResult = { ok: boolean; error?: string };

// Drop-in replacement for next-auth/react's signIn("credentials", ...).
// Mirrors the old authorize() behavior: password check + inline TOTP
// verification before the login flow is considered complete. On success the
// Supabase session cookie is already set by signInWithPassword; the TOTP
// step (if required) additionally sets the mfa_verified cookie via
// /api/v1/auth/mfa/challenge-verify so middleware won't re-prompt for 2FA.
export async function signInWithCredentials(params: {
  email: string;
  password: string;
  totpCode?: string;
}): Promise<CredentialsSignInResult> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error || !data.session || !data.user) {
    return { ok: false, error: error?.message ?? "Invalid credentials" };
  }

  const { data: mfaSettings } = await sb
    .from("user_mfa_settings")
    .select("mfa_enabled, verified")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const mfaEnabled = Boolean(mfaSettings?.mfa_enabled && mfaSettings?.verified);
  if (!mfaEnabled) {
    void fetch("/api/auth/post-login", { method: "POST", credentials: "same-origin" }).catch(() => {});
    return { ok: true };
  }

  // Password was correct but 2FA hasn't been verified yet — sign back out so
  // no usable session sits around while the login form prompts for the code.
  // This mirrors the old NextAuth authorize()'s guarantee that no session
  // token is ever issued until MFA passes.
  if (!params.totpCode) {
    await sb.auth.signOut();
    return { ok: false, error: "MFA_REQUIRED" };
  }

  const res = await fetch("/api/v1/auth/mfa/challenge-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ totpCode: params.totpCode }),
  });
  if (!res.ok) {
    await sb.auth.signOut();
    return { ok: false, error: "MFA_INVALID" };
  }

  void fetch("/api/auth/post-login", { method: "POST", credentials: "same-origin" }).catch(() => {});
  return { ok: true };
}

// Drop-in replacement for next-auth/react's signIn(provider, ...) for OAuth.
export async function signInWithOAuthProvider(
  provider: "google" | "github",
  opts?: { callbackUrl?: string }
) {
  const sb = getSupabase();
  const next = encodeURIComponent(opts?.callbackUrl ?? "/dashboard");
  await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
  });
}

// Drop-in replacement for next-auth/react's signOut(...).
export async function signOutAndRedirect(opts?: { callbackUrl?: string }) {
  const sb = getSupabase();
  await sb.auth.signOut();
  window.location.href = opts?.callbackUrl ?? "/login";
}
