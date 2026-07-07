import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  status: "success" | "failure";
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);

    const { data: logs } = await sbAdmin
      .from("audit_logs")
      .select("id, user_id, action, resource, resource_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AuditLogRow[]>();

    // Collect unique user_ids from logs
    const userIds = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean))] as string[];

    // Fetch profiles (full_name) + auth emails for each user
    const profileMap = new Map<string, { email: string; full_name: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await sbAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.user_id as string, {
          email: "",
          full_name: (p.full_name as string) || "",
        });
      }

      // Enrich with email from auth.admin (best-effort)
      await Promise.allSettled(
        userIds.map(async (uid) => {
          const { data } = await sbAdmin.auth.admin.getUserById(uid);
          if (data?.user?.email) {
            const existing = profileMap.get(uid) ?? { email: "", full_name: "" };
            profileMap.set(uid, { ...existing, email: data.user.email });
          }
        })
      );
    }

    const activity = (logs ?? []).map((log) => {
      const profile = log.user_id ? profileMap.get(log.user_id) : undefined;
      return {
        id: log.id,
        action: log.action,
        resource: log.resource,
        status: log.status,
        created_at: log.created_at,
        user_email: profile?.email ?? null,
        user_name: profile?.full_name ?? null,
      };
    });

    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
