import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { adminListUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

type AuditLogRow = {
  id: string | number;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  status: "success" | "failure";
  status_code: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function dateRangeEnd(value: string) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);
    const search = req.nextUrl.searchParams;
    const page = Math.max(1, Number(search.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(search.get("limit") || "50")));
    const userQuery = (search.get("user") || "").trim().toLowerCase();
    const eventType = (search.get("event") || "").trim().toLowerCase();
    const from = (search.get("from") || "").trim();
    const to = (search.get("to") || "").trim();
    const fromOffset = (page - 1) * limit;
    const toOffset = fromOffset + limit - 1;

    let query = sbAdmin
      .from("audit_logs")
      .select("id, user_id, action, resource, resource_id, status, status_code, details, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (eventType) {
      query = query.or(`action.ilike.%${eventType}%,resource.ilike.%${eventType}%`);
    }
    if (from) {
      query = query.gte("created_at", new Date(`${from}T00:00:00.000`).toISOString());
    }
    if (to) {
      const end = dateRangeEnd(to);
      if (end) query = query.lte("created_at", end);
    }

    const [{ data: logs, count }, users] = await Promise.all([
      query.range(fromOffset, toOffset).returns<AuditLogRow[]>(),
      adminListUsers(),
    ]);

    const userById = new Map(users.map((user) => [user.id, user]));
    const filtered = (logs ?? []).map((log) => {
      const user = log.user_id ? userById.get(log.user_id) : undefined;
      const detailText =
        typeof log.details === "object" && log.details
          ? Object.entries(log.details).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
          : "";

      return {
        id: String(log.id),
        action: log.action,
        resource: log.resource,
        resource_id: log.resource_id,
        status: log.status,
        status_code: log.status_code,
        created_at: log.created_at,
        details: detailText,
        user_email: user?.email ?? null,
        user_name: user?.full_name ?? null,
      };
    }).filter((item) => {
      if (!userQuery) return true;
      const haystack = [item.user_email, item.user_name, item.details].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(userQuery);
    });

    return NextResponse.json({
      page,
      limit,
      total: count ?? filtered.length,
      items: filtered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
