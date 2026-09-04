import { createClient } from "@supabase/supabase-js";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { isSchemaCompatError } from "@/lib/server/api-helpers";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("supabaseUrl is required.");
  if (!key) throw new Error("supabaseKey is required.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ResolvedQrRenderData = {
  title: string;
  payload: string;
  link: string;
  styleConfig: unknown;
};

/**
 * Bir QR'ın slug'ından, gerçek redirect hedefini, kayıtlı stilini ve
 * (varsa) white-label domainini çözer — render ve pdf endpoint'leri
 * arasında ortak kullanılır.
 */
export async function resolveQrRenderData(reqOrigin: string, slug: string, table?: number): Promise<ResolvedQrRenderData | null> {
  const supabase = getSupabase();

  let { data: qr, error } = await supabase
    .from("qr_codes")
    .select("title,short_slug,target_url,qr_type,qr_mode,static_payload,style_id,user_id,qr_design,qr_styles(config)")
    .eq("short_slug", slug)
    .maybeSingle();

  // Legacy production şemalarında qr_mode/static_payload henüz bulunmuyor.
  // Bu kayıtların tamamı yönetilen /q/:slug QR'ları olduğundan eski kolonlarla
  // tekrar okuyup dinamik payload ve kayıtlı tasarımı üretmeye devam ederiz.
  if (error && isSchemaCompatError(error)) {
    const legacy = await supabase
      .from("qr_codes")
      .select("title,short_slug,target_url,qr_type,style_id,user_id,qr_design,qr_styles(config)")
      .eq("short_slug", slug)
      .maybeSingle();
    qr = legacy.data as typeof qr;
    error = legacy.error;
  }

  if (error || !qr) return null;

  const typedQr = qr as {
    title?: string | null;
    short_slug: string;
    target_url?: string | null;
    qr_type?: string | null;
    qr_mode?: "static" | "dynamic" | null;
    static_payload?: string | null;
    style_id?: string | null;
    user_id?: string | null;
    qr_design?: unknown;
    qr_styles?: { config?: unknown } | { config?: unknown }[] | null;
  };

  let origin = getPublicAppOrigin(reqOrigin);
  if (typedQr.user_id) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("custom_domain")
      .eq("user_id", typedQr.user_id)
      .maybeSingle();
    if (settings?.custom_domain) {
      origin = `https://${settings.custom_domain}`;
    }
  }

  const tableSuffix = Number.isInteger(table) && (table as number) > 0 && (table as number) <= 999 ? `?table=${table}` : "";
  const link = `${origin}/q/${typedQr.short_slug}${tableSuffix}`;
  const payload = typedQr.qr_mode === "static" && typedQr.static_payload
    ? typedQr.static_payload
    : link;

  const styleRows = typedQr.qr_styles;
  let styleConfig = typedQr.qr_design && typeof typedQr.qr_design === "object" && Object.keys(typedQr.qr_design as object).length > 0
    ? typedQr.qr_design
    : Array.isArray(styleRows) ? styleRows[0]?.config : styleRows?.config;
  if (!styleConfig && typedQr.style_id) {
    const { data: directStyle } = await supabase
      .from("qr_styles")
      .select("config")
      .eq("id", typedQr.style_id)
      .maybeSingle();
    styleConfig = directStyle?.config;
  }

  return {
    title: typedQr.title || typedQr.short_slug,
    payload,
    link,
    styleConfig,
  };
}
