import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { adminListUsers } from "@/lib/auth";

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

    const [{ data: logs }, users] = await Promise.all([
      sbAdmin
        .from("audit_logs")
        .select("id, user_id, action, resource, resource_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AuditLogRow[]>(),
      adminListUsers(),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));

    const activity = (logs ?? []).map((log) => {
      const user = log.user_id ? userById.get(log.user_id) : undefined;
      return {
        id: log.id,
        action: log.action,
        resource: log.resource,
        status: log.status,
        created_at: log.created_at,
        user_email: user?.email ?? null,
        user_name: user?.full_name ?? null,
      };
    });

    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
