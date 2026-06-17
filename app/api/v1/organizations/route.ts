import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, authRequest } from "@/lib/server/api-helpers";
import { slugify } from "@/lib/org-guard";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations — list orgs the caller belongs to
export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = sbAdmin();
  const { data, error } = await sb
    .from("organization_members")
    .select("role, status, joined_at, organizations(id, name, slug, logo_url, owner_id, created_at)")
    .eq("user_id", auth.userId)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Count members per org
  const orgIds = (data ?? []).map((r: any) => r.organizations?.id).filter(Boolean);
  const { data: counts } = orgIds.length
    ? await sb
        .from("organization_members")
        .select("org_id")
        .in("org_id", orgIds)
        .eq("status", "active")
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) countMap[(c as any).org_id] = (countMap[(c as any).org_id] ?? 0) + 1;

  const organizations = (data ?? []).map((r: any) => ({
    ...(r.organizations ?? {}),
    my_role: r.role as string,
    member_count: countMap[r.organizations?.id] ?? 1,
  }));

  return NextResponse.json({ organizations });
}

// POST /api/v1/organizations — create a new org
export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Organizasyon adı zorunlu." }, { status: 400 });

  const baseSlug = body.slug ? String(body.slug).trim() : slugify(name);
  if (!baseSlug) return NextResponse.json({ error: "Geçersiz slug." }, { status: 400 });

  const sb = sbAdmin();

  // Ensure unique slug
  let slug = baseSlug;
  const { data: existing } = await sb
    .from("organizations")
    .select("slug")
    .like("slug", `${baseSlug}%`);
  if ((existing ?? []).some((r: any) => r.slug === baseSlug)) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .insert({ name, slug, owner_id: auth.userId, logo_url: body.logo_url ?? null })
    .select()
    .single();

  if (orgErr) {
    if (orgErr.code === "23505") return NextResponse.json({ error: "Bu slug zaten kullanımda." }, { status: 409 });
    return NextResponse.json({ error: orgErr.message }, { status: 400 });
  }

  // Add creator as owner member
  await sb.from("organization_members").insert({
    org_id: org.id,
    user_id: auth.userId,
    role: "owner",
    invited_by: null,
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
