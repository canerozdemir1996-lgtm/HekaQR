import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

// Keep this list aligned with lib/auth.ts. Identifiers are never printed by
// this read-only report.
const rootOwners = new Set([
  "erhanalgl@gmail.com",
  "erhanlalgl@gmail.com",
  "canerozdemir1996@gmail.com",
  ...(process.env.ROOT_OWNER_EMAILS ?? process.env.NEXT_PUBLIC_ROOT_OWNER_EMAILS ?? "").split(","),
].map((value) => value.trim().toLowerCase()).filter(Boolean));
const privileged = new Set(["admin", "owner"]);
const fingerprint = (id) => createHash("sha256").update(id).digest("hex").slice(0, 16);
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 1000) break;
}

const trusted = [];
const suspicious = [];
for (const user of users) {
  const appRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "user";
  const claimedRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "user";
  const rootMapped = !!user.email && rootOwners.has(user.email.toLowerCase());
  if (rootMapped || privileged.has(appRole)) {
    trusted.push({
      user: fingerprint(user.id),
      role: rootMapped ? "owner" : appRole,
      source: rootMapped ? "explicit_root_owner_mapping" : "app_metadata",
    });
  }
  if (privileged.has(claimedRole) && !rootMapped && !privileged.has(appRole)) {
    suspicious.push({ user: fingerprint(user.id), claimedRole, action: "manual_review_required" });
  }
}

console.log(JSON.stringify({
  mode: "READ_ONLY",
  totalUsers: users.length,
  trustedPrivilegedCount: trusted.length,
  suspiciousLegacyClaimCount: suspicious.length,
  trusted,
  suspicious,
  policy: "Never promote user_metadata.role. Organization membership is tenant-scoped and is not a global admin source.",
}, null, 2));
