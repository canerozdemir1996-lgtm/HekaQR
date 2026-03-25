import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Loglama ve sayaç işlemleri için sistem yetkili Supabase istemcisi oluşturuyoruz.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // 1. QR Kodu ve kurallarını getir
    const { data: qr, error } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("short_slug", slug)
      .single();

    if (error || !qr) {
      return NextResponse.redirect(new URL("/404", req.url));
    }

    // 2. Durum ve Güvenlik Kontrolleri
    if (!qr.is_active) {
      return NextResponse.redirect(new URL("/inactive", req.url)); // Pasif sayfası yapılabilir
    }
    if (qr.expires_at && new Date() > new Date(qr.expires_at)) {
      return NextResponse.redirect(new URL("/expired", req.url)); // Süresi dolmuş sayfası
    }
    if (qr.scan_limit && qr.scan_count >= qr.scan_limit) {
      return NextResponse.redirect(new URL("/limit-reached", req.url)); // Limit aşımı sayfası
    }
    if (qr.password) {
      // Şifreli ise, doğrudan şifre ekranına yönlendir
      return NextResponse.redirect(new URL(`/protected/${slug}`, req.url));
    }

    // 3. Analitik Verilerini Çıkar
    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const country = req.headers.get("x-vercel-ip-country") || "TR";
    const city = req.headers.get("x-vercel-ip-city") || "Unknown";
    
    const isMobile = /mobile/i.test(ua);
    const isTablet = /tablet/i.test(ua);
    const deviceType = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";
    
    let os = "Unknown";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(ua)) os = "MacOS";
    else if (/linux/i.test(ua)) os = "Linux";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
    else if (/android/i.test(ua)) os = "Android";

    // 4. Asenkron Loglama (Performansı kesmemesi için Promise çalıştırıyoruz)
    Promise.all([
      supabase.from("scan_logs").insert({
        qr_id: qr.id,
        device: deviceType,
        os,
        country,
        city,
        ip_address: ip,
        user_agent: ua,
      }),
      // Sayaç artırımı
      supabase.from("qr_codes").update({ scan_count: qr.scan_count + 1 }).eq("id", qr.id)
    ]).catch(err => console.error("Analytics log hatası:", err));

    // vCard tipi ise uygulamanın kendi içerisindeki profile git
    if (qr.qr_type === "vcard") {
      return NextResponse.redirect(new URL(`/card/${slug}`, req.url));
    }

    // 5. Akıllı Hedef URL Çözümleme (A/B, Cihaz, Ülke)
    let finalUrl = qr.target_url;

    // Ülke Kuralı Varsa
    if (qr.rules?.country_redirect?.[country]) {
      finalUrl = qr.rules.country_redirect[country];
    } 
    // Cihaz Kuralı Varsa
    else if (qr.rules?.device_redirect?.[deviceType]) {
      finalUrl = qr.rules.device_redirect[deviceType];
    }

    // A/B Trafik Testi Kuralı Varsa
    if (qr.ab_test_url && qr.ab_test_weight) {
      const rand = Math.random() * 100;
      if (rand > qr.ab_test_weight) {
        finalUrl = qr.ab_test_url;
      }
    }

    // 6. UTM Parametrelerini Hedefe Ekle
    const target = new URL(finalUrl);
    if (qr.utm_source) target.searchParams.set("utm_source", qr.utm_source);
    if (qr.utm_medium) target.searchParams.set("utm_medium", qr.utm_medium);
    if (qr.utm_campaign) target.searchParams.set("utm_campaign", qr.utm_campaign);
    if (qr.utm_term) target.searchParams.set("utm_term", qr.utm_term);
    if (qr.utm_content) target.searchParams.set("utm_content", qr.utm_content);

    // Doğru HTTP Status Code ile yönlendir (Kalıcı 301 veya Geçici 302)
    return NextResponse.redirect(target.toString(), { status: qr.redirect_type === "301" ? 301 : 302 });
  } catch (error) {
    return NextResponse.redirect(new URL("/404", req.url));
  }
}