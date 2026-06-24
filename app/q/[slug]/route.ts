import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { isUnlockCookieValid, unlockCookieName } from "@/lib/qrPasswordGate";

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

function redirectNoStore(url: URL | string, status?: 301 | 302 | 307 | 308) {
  const response = status ? NextResponse.redirect(url, { status }) : NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const ip = clientIp(req);
    if (!checkRateLimit(`qr_scan:${ip}`, RATE_LIMITS.QR_SCAN.max, RATE_LIMITS.QR_SCAN.windowMs)) {
      return tooManyRequestsResponse();
    }

    const { slug } = await params;
    if (!slug) {
      return redirectNoStore(new URL("/404", req.url));
    }

    const supabase = getSupabaseAdmin();

    const { data: qr, error } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("short_slug", slug.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !qr) {
      return redirectNoStore(new URL("/404", req.url));
    }

    // Bu sunucu birden fazla müşterinin custom domain'ini tek bir app
    // instance'ına proxy'liyor (nginx, bkz. scripts/provision-custom-domain.sh).
    // İstek bir müşterinin kendi doğrulanmış domain'i üzerinden geldiyse,
    // sadece O domain'in sahibine ait QR'lar gösterilebilir — aksi halde
    // herkes herkesin QR'ını kendi domain'inde görebilirdi.
    const domainOwnerId = await resolveVerifiedDomainOwnerId(req.headers.get("host"), supabase);
    if (domainOwnerId && qr.user_id !== domainOwnerId) {
      return redirectNoStore(new URL("/404", req.url));
    }

    if (qr.is_active === false) {
      return redirectNoStore(new URL("/inactive", req.url));
    }
    if (qr.expires_at && new Date() > new Date(qr.expires_at)) {
      return redirectNoStore(new URL("/expired", req.url));
    }
    if (qr.scan_limit && qr.scan_count >= qr.scan_limit) {
      return redirectNoStore(new URL("/limit-reached", req.url));
    }
    if (qr.password) {
      const unlockCookie = req.cookies.get(unlockCookieName(slug))?.value;
      if (!isUnlockCookieValid(slug, qr.password, unlockCookie)) {
        return redirectNoStore(new URL(`/protected/${slug}`, req.url));
      }
    }

    const userAgent = req.headers.get("user-agent") || "";
    const country = req.headers.get("x-vercel-ip-country") || "TR";
    const city = req.headers.get("x-vercel-ip-city") || "Unknown";
    const deviceType = detectDevice(userAgent);
    const os = detectOs(userAgent);

    const decodedCity = (() => {
      try {
        return decodeURIComponent(city);
      } catch {
        return city;
      }
    })();

    const { error: scanLogError } = await supabase.from("scan_logs").insert({
        qr_id: qr.id,
        device: deviceType,
        os,
        country,
        city: decodedCity,
        ip_hash: ip === "unknown" ? null : sha256(ip),
        user_agent: userAgent,
      });

    if (scanLogError) {
      console.error("Analytics log error:", scanLogError);
    } else {
      const { count, error: countError } = await supabase
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .eq("qr_id", qr.id);
      const nextScanCount = countError ? (qr.scan_count ?? 0) + 1 : count ?? (qr.scan_count ?? 0) + 1;
      await supabase
        .from("qr_codes")
        .update({ scan_count: nextScanCount })
        .eq("id", qr.id);
    }

    if (qr.qr_type === "vcard") {
      return redirectNoStore(new URL(`/card/${slug}`, req.url));
    }

    if (qr.qr_type === "multi" || qr.dynamic_content?.kind === "multi") {
      return redirectNoStore(new URL(`/links/${slug}`, req.url));
    }

    if (qr.qr_type === "menu" || qr.dynamic_content?.kind === "menu") {
      const menuUrl = new URL(`/menu/${slug}`, req.url);
      const table = req.nextUrl.searchParams.get("table");
      const lang = req.nextUrl.searchParams.get("lang");
      if (table && /^\d{1,3}$/.test(table)) menuUrl.searchParams.set("table", table);
      if (lang === "tr" || lang === "en") menuUrl.searchParams.set("lang", lang);
      return redirectNoStore(menuUrl);
    }

    if (qr.qr_type === "feedback" || qr.dynamic_content?.kind === "feedback") {
      const feedbackUrl = new URL(`/feedback/${slug}`, req.url);
      const deviceId = req.nextUrl.searchParams.get("deviceId");
      const lang = req.nextUrl.searchParams.get("lang");
      if (deviceId) feedbackUrl.searchParams.set("deviceId", deviceId);
      if (lang === "tr" || lang === "en") feedbackUrl.searchParams.set("lang", lang);
      return redirectNoStore(feedbackUrl);
    }

    if (qr.dynamic_content?.kind === "booking") {
      const bookingUrl = new URL(`/booking/${slug}`, req.url);
      const lang = req.nextUrl.searchParams.get("lang");
      if (lang === "tr" || lang === "en") bookingUrl.searchParams.set("lang", lang);
      return redirectNoStore(bookingUrl);
    }

    if (qr.dynamic_content?.kind === "doc") {
      const docUrl = new URL(`/doc/${slug}`, req.url);
      return redirectNoStore(docUrl);
    }

    if (qr.dynamic_content?.kind === "appstore") {
      return redirectNoStore(new URL(`/appstore/${slug}`, req.url));
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
      return redirectNoStore(new URL("/404", req.url));
    }

    const target = new URL(finalUrl);
    if (qr.utm_source) target.searchParams.set("utm_source", qr.utm_source);
    if (qr.utm_medium) target.searchParams.set("utm_medium", qr.utm_medium);
    if (qr.utm_campaign) target.searchParams.set("utm_campaign", qr.utm_campaign);
    if (qr.utm_term) target.searchParams.set("utm_term", qr.utm_term);
    if (qr.utm_content) target.searchParams.set("utm_content", qr.utm_content);

    return redirectNoStore(target.toString(), qr.redirect_type === "301" ? 301 : 302);
  } catch (error) {
    console.error("QR redirect error:", error);
    return redirectNoStore(new URL("/404", req.url));
  }
}
