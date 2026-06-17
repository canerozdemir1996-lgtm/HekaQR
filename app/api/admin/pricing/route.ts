import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import {
  pricingPlans,
  comparisonRows,
  enterpriseSliders,
  faqItems,
  trustItems,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

const VALID_KEYS = ["plans", "comparison", "enterprise", "faq", "trust"] as const;
type ConfigKey = (typeof VALID_KEYS)[number];

const DEFAULTS: Record<ConfigKey, unknown> = {
  plans: pricingPlans,
  comparison: comparisonRows,
  enterprise: enterpriseSliders,
  faq: faqItems,
  trust: trustItems,
};

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);

    const { data, error } = await sbAdmin
      .from("admin_pricing_config")
      .select("key, value, updated_at");

    const stored: Partial<Record<ConfigKey, { value: unknown; updated_at: string }>> = {};
    if (!error && data) {
      for (const row of data) {
        if (VALID_KEYS.includes(row.key as ConfigKey)) {
          stored[row.key as ConfigKey] = { value: row.value, updated_at: row.updated_at };
        }
      }
    }

    const config = Object.fromEntries(
      VALID_KEYS.map((k) => [k, stored[k]?.value ?? DEFAULTS[k]])
    );

    const meta = Object.fromEntries(
      VALID_KEYS.map((k) => [k, stored[k]?.updated_at ?? null])
    );

    return NextResponse.json({ config, meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);
    const body = await req.json();
    const key = String(body.key ?? "");
    const value = body.value;

    if (!VALID_KEYS.includes(key as ConfigKey)) {
      return NextResponse.json({ error: `Geçersiz anahtar: ${key}` }, { status: 400 });
    }
    if (value === undefined || value === null) {
      return NextResponse.json({ error: "value zorunlu" }, { status: 400 });
    }

    const { error } = await sbAdmin
      .from("admin_pricing_config")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
