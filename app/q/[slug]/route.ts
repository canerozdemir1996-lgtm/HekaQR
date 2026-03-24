import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { createSafeBridgePage, sanitizeUrl } from "@/lib/utils/htmlSanitizer";
import { detectDevice, detectOS, parseUserAgent } from "@/lib/utils/deviceDetection";
import { applyRules } from "@/lib/utils/ruleEngine";
import { appendUtmParams, buildShortLinkUrl } from "@/lib/utils/urlBuilder";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("supabaseUrl is required.");
  if (!key) throw new Error("supabaseKey is required.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}



function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

function errorHtml(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#030712;color:#f1f5f9}.card{background:#0f172a;border:1px solid #1e293b;border-radius:1rem;padding:2.5rem;max-width:380px;width:100%;text-align:center;margin:1rem}h2{font-size:1.25rem;font-weight:800;margin-bottom:.75rem}p{color:#94a3b8;font-size:.875rem;line-height:1.65}input{width:100%;background:#1e293b;border:1.5px solid #334155;border-radius:.625rem;padding:.75rem 1rem;color:#f1f5f9;font-size:1rem;outline:none;margin:1rem 0 .5rem}input:focus{border-color:#6366f1}.err{color:#f87171;font-size:.8rem;margin:.5rem 0}button{width:100%;background:#6366f1;color:#fff;border:none;border-radius:.625rem;padding:.75rem;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:.25rem}button:hover{background:#4f46e5}</style></head>
<body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const supabase = getSupabase();
  const { slug } = await context.params;
  const { searchParams } = req.nextUrl;
  const pwdAttempt = searchParams.get("pwd");
  const ua = req.headers.get("user-agent") ?? "";
  const origin = req.nextUrl.origin;

  const { data: qr, error } = await supabase
    .from("qr_codes")
    .select("id,user_id,title,target_url,qr_type,is_active,password,scan_limit,scan_count,expires_at,pixel_id,pixel_enabled,utm_source,utm_medium,utm_campaign,utm_term,utm_content,redirect_type,ab_test_url,ab_test_weight,vcard_data,rules,ga4_measurement_id,gtm_container_id,webhook_url")
    .ilike("short_slug", slug)
    .maybeSingle();

  if (error) return errorHtml("Hata", "<h2>⚠️ Sunucu Hatası</h2><p>Lütfen daha sonra tekrar deneyin.</p>", 500);
  if (!qr)   return errorHtml("Bulunamadı", "<h2>🔍 Bulunamadı</h2><p>Bu QR kodu mevcut değil.</p>", 404);
  if (!qr.is_active) return errorHtml("Devre Dışı", "<h2>❌ Devre Dışı</h2><p>Bu QR kodu aktif değil.</p>", 410);
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) return errorHtml("Süresi Doldu","<h2>⏰ Süresi Doldu</h2><p>Bu QR kodunun süresi doldu.</p>",410);
  if (qr.scan_limit !== null && qr.scan_count >= qr.scan_limit) return errorHtml("Limit Aşıldı",`<h2>🚫 Limit Aşıldı</h2><p>Bu QR kodu maksimum ${qr.scan_limit} taramaya ulaştı.</p>`,410);

  // Dinamik QR desteği: dynamic_content'ten URL'i al
  let effectiveUrl = qr.target_url;
  const qrAny = qr as any;
  if (qrAny.is_dynamic && qrAny.dynamic_content && typeof qrAny.dynamic_content === 'object') {
    const dynamicUrl = qrAny.dynamic_content.target_url || qrAny.dynamic_content.url;
    if (dynamicUrl) effectiveUrl = dynamicUrl;
  }

  // Password
  if (qr.password) {
    if (!pwdAttempt) return errorHtml("Şifre Gerekli",
      `<h2>🔒 Şifreli İçerik</h2><p>Devam etmek için şifreyi girin.</p><form method="GET" action="/q/${slug}"><input type="password" name="pwd" placeholder="Şifre" autofocus/><button type="submit">Devam Et →</button></form>`);
    if (pwdAttempt !== qr.password) return errorHtml("Hatalı Şifre",
      `<h2>🔒 Şifreli İçerik</h2><p>Devam etmek için şifreyi girin.</p><form method="GET" action="/q/${slug}"><input type="password" name="pwd" placeholder="Şifre" autofocus/><p class="err">⚠ Yanlış şifre</p><button type="submit">Devam Et →</button></form>`);
  }

  // Settings fallback (account-level defaults)
  type SettingsRow = { ga4_measurement_id: string | null; gtm_container_id: string | null; webhook_url: string | null };
  let settings: SettingsRow | null = null;
  if (qr.user_id) {
    const { data } = await supabase
      .from("user_settings")
      .select("ga4_measurement_id,gtm_container_id,webhook_url")
      .eq("user_id", qr.user_id)
      .maybeSingle();
    settings = (data ?? null) as SettingsRow | null;
  }
  const effGa4 = (qr.ga4_measurement_id ?? settings?.ga4_measurement_id ?? null);
  const effGtm = (qr.gtm_container_id ?? settings?.gtm_container_id ?? null);
  const effWebhook = (qr.webhook_url ?? settings?.webhook_url ?? null);

  // --- Unique fingerprint (daily) ---
  const ip = getClientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = sha256Hex(`${qr.id}|${day}|${ip}|${ua.slice(0, 128)}`);

  // Fire-and-forget analytics (+ webhook)
  Promise.all([
    supabase.from("scan_logs").insert({
      qr_id: qr.id,
      device: detectDevice(ua),
      os: detectOS(ua),
      user_agent: ua.slice(0, 512),
      ip_hash: ip ? sha256Hex(ip) : null,
      fingerprint,
      country: (req.headers.get("x-vercel-ip-country") ?? null),
    }),
    supabase.from("qr_codes").update({ scan_count: qr.scan_count + 1 }).eq("id", qr.id),
    effWebhook
      ? fetch(String(effWebhook), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "qr_scan",
            qr_id: qr.id,
            slug,
            scanned_at: new Date().toISOString(),
            device: detectDevice(ua),
            os: detectOS(ua),
            country: req.headers.get("x-vercel-ip-country") ?? null,
          }),
        }).catch(() => {})
      : Promise.resolve(),
  ]).catch(() => {});

  // vCard → redirect to /card/[slug] landing page
  if (qr.qr_type === "vcard" && qr.vcard_data) {
    return NextResponse.redirect(`${origin}/card/${slug}`, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // A/B test
  let targetUrl = effectiveUrl as string;
  if (qr.ab_test_url) {
    const w = typeof qr.ab_test_weight === "number" ? qr.ab_test_weight : 50;
    targetUrl = Math.random() * 100 < w ? effectiveUrl : qr.ab_test_url;
  }

  // Conditional routing rules
  const ruled = applyRules(targetUrl, qr.rules as any, {
    userAgent: ua,
    country: req.headers.get("x-vercel-ip-country") ?? undefined,
  });
  const finalUrl = appendUtmParams(ruled, {
    source: qr.utm_source,
    medium: qr.utm_medium,
    campaign: qr.utm_campaign,
    term: qr.utm_term,
    content: qr.utm_content,
  });

  // Tracking bridge (Pixel / GA4 / GTM)
  if ((qr.pixel_id && qr.pixel_enabled === true) || effGa4 || effGtm) {
    return new NextResponse(createSafeBridgePage({
      pixelId: (qr.pixel_id && qr.pixel_enabled === true) ? qr.pixel_id : null,
      ga4Id: effGa4,
      gtmId: effGtm,
      qrId: qr.id,
      redirectUrl: finalUrl,
      title: qr.title ?? "",
    }), {
      status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  // Direct redirect
  return NextResponse.redirect(finalUrl, {
    status: qr.redirect_type === "301" ? 301 : 302,
    headers: { "Cache-Control": "no-store" },
  });
}
