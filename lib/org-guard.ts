import { sbAdmin, authRequest } from "@/lib/server/api-helpers";
import type { NextRequest } from "next/server";
import { normalizeSlug } from "@/lib/slug";

export type OrgRole = "owner" | "admin" | "editor" | "viewer";

const RANK: Record<OrgRole, number> = {
  owner: 4, admin: 3, editor: 2, viewer: 1,
};

export function orgRoleRank(role: OrgRole) {
  return RANK[role] ?? 0;
}

export function validateOrgRole(value: unknown): OrgRole {
  if (value === "owner" || value === "admin" || value === "editor" || value === "viewer") return value;
  return "viewer";
}

export function validateMemberRole(value: unknown): "admin" | "editor" | "viewer" {
  if (value === "admin" || value === "editor" || value === "viewer") return value;
  return "viewer";
}

export async function requireOrgAccess(
  req: NextRequest,
  orgId: string,
  minRole: OrgRole = "viewer"
): Promise<{ userId: string; role: OrgRole }> {
  const auth = await authRequest(req);
  if (!auth) throw new Error("Unauthorized");

  const sb = sbAdmin();
  const { data, error } = await sb
    .from("organization_members")
    .select("role, status")
    .eq("org_id", orgId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") throw new Error("Forbidden");

  const role = data.role as OrgRole;
  if (RANK[role] < RANK[minRole]) throw new Error("Forbidden");

  return { userId: auth.userId, role };
}

export function orgErrorResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
  return { error: msg, status };
}

export function slugify(text: string) {
  return normalizeSlug(text, { maxLength: 40 });
}
