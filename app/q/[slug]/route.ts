import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import geoip from "geoip-lite";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { isUnlockCookieValid, unlockCookieName } from "@/lib/qrPasswordGate";
import { getLimits, normalizePlan } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function detectDevice(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function detectOs(userAgent: string) {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/mac/i.test(userAgent)) return "MacOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}

function currentMonthPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Aylık tarama limitini kontrol eder. Plan bilgisi okunamazsa veya RPC henüz
// migrate edilmemişse (isSchemaCompatError benzeri durum) sessizce true döner —
// bir altyapı arızası asla mevcut taramaları loglamayı durdurmamalı.
async function isUnderMonthlyScanCap(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return true;

  try {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("current_plan")
      .eq("user_id", userId)
      .maybeSingle();

    const cap = getLimits(normalizePlan(settings?.current_plan)).max_monthly_scans;
    if (cap === -1) return true;

    const { data, error } = await supabase.rpc("increment_monthly_scan_count", {
      p_user_id: userId,
      p_period: currentMonthPeriod(),
      p_cap: cap,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

function redirectNoStore(url: URL | string, visitorId: string, status?: 301 | 302 | 307 | 308) {
  const response = status ? NextResponse.redirect(url, { status }) : NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.cookies.set("qr_visitor_id", visitorId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const ip = clientIp(req);
    const visitorId = req.cookies.get("qr_visitor_id")?.value || crypto.randomUUID();
    if (!checkRateLimit(`qr_scan:${ip}`, RATE_LIMITS.QR_SCAN.max, RATE_LIMITS.QR_SCAN.windowMs)) {
      return tooManyRequestsResponse();
    }

    const { slug } = await params;
    if (!slug) {
      return redirectNoStore(new URL("/404", req.url), visitorId);
    }

    const supabase = getSupabaseAdmin();

    const { data: qr, error } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("short_slug", slug.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !qr) {
      return redirectNoStore(new URL("/404", req.url), visitorId);
    }

    // Bu sunucu birden fazla müşterinin custom domain'ini tek bir app
    // instance'ına proxy'liyor (nginx, bkz. scripts/provision-custom-domain.sh).
    // İstek bir müşterinin kendi doğrulanmış domain'i üzerinden geldiyse,
    // sadece O domain'in sahibine ait QR'lar gösterilebilir — aksi halde
    // herkes herkesin QR'ını kendi domain'inde görebilirdi.
    const domainOwnerId = await resolveVerifiedDomainOwnerId(req.headers.get("host"), supabase);
    if (domainOwnerId && qr.user_id !== domainOwnerId) {
      return redirectNoStore(new URL("/404", req.url), visitorId);
    }

    if (qr.is_active === false) {
      return redirectNoStore(new URL("/inactive", req.url), visitorId);
    }
    if (qr.expires_at && new Date() > new Date(qr.expires_at)) {
      return redirectNoStore(new URL("/expired", req.url), visitorId);
    }
    if (qr.scan_limit && qr.scan_count >= qr.scan_limit) {
      return redirectNoStore(new URL("/limit-reached", req.url), visitorId);
    }
    if (qr.password) {
      const unlockCookie = req.cookies.get(unlockCookieName(slug))?.value;
      if (!isUnlockCookieValid(slug, qr.password, unlockCookie)) {
        return redirectNoStore(new URL(`/protected/${slug}`, req.url), visitorId);
      }
    }

    const userAgent = req.headers.get("user-agent") || "";
    // Vercel'de değiliz — geoip-lite ile IP'den ülke/şehir çözümlüyoruz.
    // Nginx X-Real-Country header'ı varsa önce onu deneriz (gelecekte nginx
    // GeoIP modülü eklenirse sıfır kod değişikliğiyle çalışır).
    const rawIpForGeo = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ip;
    const geoOverrideCountry = req.headers.get("x-real-country");
    const geoOverrideCity = req.headers.get("x-real-city");
    const geo = rawIpForGeo && rawIpForGeo !== "unknown" ? geoip.lookup(rawIpForGeo) : null;
    const country = geoOverrideCountry || geo?.country || "TR";
    const city = geoOverrideCity || geo?.city || "Unknown";
    const deviceType = detectDevice(userAgent);
    const os = detectOs(userAgent);

    const decodedCity = (() => {
      try {
        return decodeURIComponent(city);
      } catch {
        return city;
      }
    })();

    const shouldLogScan = await isUnderMonthlyScanCap(supabase, qr.user_id);

    if (shouldLogScan) {
      const { error: scanLogError } = await supabase.from("scan_logs").insert({
          qr_id: qr.id,
          device: deviceType,
          os,
          country,
          city: decodedCity,
          ip_hash: ip === "unknown" ? null : sha256(ip),
          fingerprint: sha256(visitorId),
          user_agent: userAgent,
        });

      if (scanLogError) {
        console.error("Analytics log error:", scanLogError);
      }
    }
    // Aylık tarama limiti dolan kullanıcılar için yönlendirme her zaman
    // çalışmaya devam eder — sadece analitik kaydı durur. Ziyaretçi etkisi
    // sıfırdır; sahibi panelde "limite ulaşıldı" bilgisini görür.

    if (qr.qr_type === "vcard") {
      return redirectNoStore(new URL(`/card/${slug}`, req.url), visitorId);
    }

    if (qr.qr_type === "multi" || qr.dynamic_content?.kind === "multi") {
      return redirectNoStore(new URL(`/links/${slug}`, req.url), visitorId);
    }

    if (qr.qr_type === "menu" || qr.dynamic_content?.kind === "menu") {
      const menuUrl = new URL(`/menu/${slug}`, req.url);
      const table = req.nextUrl.searchParams.get("table");
      const lang = req.nextUrl.searchParams.get("lang");
      if (table && /^\d{1,3}$/.test(table)) menuUrl.searchParams.set("table", table);
      if (lang === "tr" || lang === "en") menuUrl.searchParams.set("lang", lang);
      return redirectNoStore(menuUrl, visitorId);
    }

    if (qr.qr_type === "feedback" || qr.dynamic_content?.kind === "feedback") {
      const feedbackUrl = new URL(`/feedback/${slug}`, req.url);
      const deviceId = req.nextUrl.searchParams.get("deviceId");
      const lang = req.nextUrl.searchParams.get("lang");
      if (deviceId) feedbackUrl.searchParams.set("deviceId", deviceId);
      if (lang === "tr" || lang === "en") feedbackUrl.searchParams.set("lang", lang);
      return redirectNoStore(feedbackUrl, visitorId);
    }

    if (qr.dynamic_content?.kind === "booking") {
      const bookingUrl = new URL(`/booking/${slug}`, req.url);
      const lang = req.nextUrl.searchParams.get("lang");
      if (lang === "tr" || lang === "en") bookingUrl.searchParams.set("lang", lang);
      return redirectNoStore(bookingUrl, visitorId);
    }

    if (qr.dynamic_content?.kind === "doc") {
      const docUrl = new URL(`/doc/${slug}`, req.url);
      return redirectNoStore(docUrl, visitorId);
    }

    if (qr.dynamic_content?.kind === "appstore") {
      return redirectNoStore(new URL(`/appstore/${slug}`, req.url), visitorId);
    }

    if (qr.dynamic_content?.kind === "gs1") {
      return redirectNoStore(new URL(`/product/${slug}`, req.url), visitorId);
    }

    let finalUrl = qr.target_url;

    if (qr.rules?.country_redirect?.[country]) {
      finalUrl = qr.rules.country_redirect[country];
    } else if (qr.rules?.device_redirect?.[deviceType]) {
      finalUrl = qr.rules.device_redirect[deviceType];
    }

    if (qr.ab_test_url && qr.ab_test_weight) {
      const rand = Math.random() * 100;
      if (rand > qr.ab_test_weight) {
        finalUrl = qr.ab_test_url;
      }
    }

    if (!finalUrl || typeof finalUrl !== "string") {
      return redirectNoStore(new URL("/404", req.url), visitorId);
    }

    const target = new URL(finalUrl);
    if (qr.utm_source) target.searchParams.set("utm_source", qr.utm_source);
    if (qr.utm_medium) target.searchParams.set("utm_medium", qr.utm_medium);
    if (qr.utm_campaign) target.searchParams.set("utm_campaign", qr.utm_campaign);
    if (qr.utm_term) target.searchParams.set("utm_term", qr.utm_term);
    if (qr.utm_content) target.searchParams.set("utm_content", qr.utm_content);

    return redirectNoStore(target.toString(), visitorId, qr.redirect_type === "301" ? 301 : 302);
  } catch (error) {
    console.error("QR redirect error:", error);
    const visitorId = req.cookies.get("qr_visitor_id")?.value || crypto.randomUUID();
    return redirectNoStore(new URL("/404", req.url), visitorId);
  }
}
