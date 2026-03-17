import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("supabaseUrl is required.");
  if (!key) throw new Error("supabaseKey is required.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function detectDevice(ua: string): "Mobile" | "Tablet" | "Desktop" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return "Mobile";
  return "Desktop";
}
function detectOS(ua: string): string {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/macintosh|mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}
function appendUtm(base: string, qr: Record<string, string | null>): string {
  try {
    const u = new URL(base);
    [["utm_source",qr.utm_source],["utm_medium",qr.utm_medium],["utm_campaign",qr.utm_campaign],
     ["utm_term",qr.utm_term],["utm_content",qr.utm_content]]
      .forEach(([k,v]) => { if (v) u.searchParams.set(k as string, v as string); });
    return u.toString();
  } catch { return base; }
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

type Rules = {
  device_redirect?: { mobile?: string; tablet?: string; desktop?: string };
  country_redirect?: Record<string, string>;
  schedule_redirect?: Array<{ start?: string; end?: string; url: string }>;
};

function applyRules(baseUrl: string, rules: Rules | null | undefined, req: NextRequest, ua: string): string {
  if (!rules) return baseUrl;

  // 1) Schedule
  if (Array.isArray(rules.schedule_redirect) && rules.schedule_redirect.length > 0) {
    const now = new Date();
    for (const r of rules.schedule_redirect) {
      const startOk = !r.start || now >= new Date(r.start);
      const endOk = !r.end || now <= new Date(r.end);
      if (startOk && endOk && r.url) return r.url;
    }
  }

  // 2) Country (Vercel header)
  const c = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  if (c && rules.country_redirect && rules.country_redirect[c]) return rules.country_redirect[c];

  // 3) Device
  const dev = detectDevice(ua);
  const dr = rules.device_redirect;
  if (dr) {
    if (dev === "Mobile" && dr.mobile) return dr.mobile;
    if (dev === "Tablet" && dr.tablet) return dr.tablet;
    if (dev === "Desktop" && dr.desktop) return dr.desktop;
  }

  return baseUrl;
}

function bridgePage(params: {
  pixelId?: string | null;
  ga4Id?: string | null;
  gtmId?: string | null;
  qrId: string;
  redirectUrl: string;
  title: string;
}): string {
  const { pixelId, ga4Id, gtmId, qrId, redirectUrl, title } = params;
  const safeTitle = (title ?? "").replace(/'/g, "\\'").replace(/</g, "&lt;");
  const safeRedirect = redirectUrl.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const hostname = (() => { try { return new URL(redirectUrl).hostname; } catch { return ""; } })();
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Yönlendiriliyor…</title>
${gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>` : ""}
${ga4Id ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());
gtag('config','${ga4Id}',{send_page_view:true});gtag('event','qr_scan',{qr_id:'${qrId}',qr_title:'${safeTitle}'});</script>` : ""}
${pixelId ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');fbq('track','ViewContent',{content_ids:['${qrId}'],content_type:'product',content_name:'${safeTitle}'});</script>` : ""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:radial-gradient(ellipse at 40% 0%,#150d2e,#04040e 55%);color:#f1f5f9}.wrap{text-align:center;padding:2rem;max-width:360px;width:100%;animation:up .5s ease both}.icon{width:68px;height:68px;border-radius:18px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1.2rem;box-shadow:0 0 48px rgba(124,58,237,.45);animation:float 3s ease-in-out infinite}.ring{position:relative;width:52px;height:52px;margin:0 auto 1.25rem}.r1{width:52px;height:52px;border-radius:50%;border:2.5px solid transparent;border-top-color:#7c3aed;animation:spin .8s linear infinite}.r2{position:absolute;inset:8px;border-radius:50%;border:2px solid transparent;border-bottom-color:#4f46e5;animation:spin .55s linear infinite reverse}.bar{width:160px;height:2px;background:rgba(255,255,255,.07);border-radius:99px;margin:1.1rem auto 0;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,#7c3aed,#4f46e5);animation:prog 1.6s ease-out forwards}.host{margin-top:1.1rem;font-size:.65rem;color:#1e293b;font-family:monospace}h1{font-size:1.25rem;font-weight:700;background:linear-gradient(130deg,#a78bfa,#818cf8 60%,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.25rem}.sub{font-size:.72rem;color:#475569;letter-spacing:.06em;margin-bottom:2rem}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes prog{from{width:4%}to{width:100%}}@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}</style></head>
<body>${gtmId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : ""}<div class="wrap"><div class="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="3" height="3" rx=".6"/><rect x="18" y="14" width="3" height="3" rx=".6"/><rect x="14" y="18" width="3" height="3" rx=".6"/><rect x="18" y="18" width="3" height="3" rx=".6"/></svg></div>
<h1>QR Hub</h1><p class="sub">GÜVENLİ YÖNLENDİRME</p>
<div class="ring"><div class="r1"></div><div class="r2"></div></div>
<div class="bar"><div class="fill"></div></div><p class="host">${hostname}</p></div>
<script>setTimeout(()=>window.location.replace("${safeRedirect}"),1600);</script></body></html>`;
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
  let targetUrl = qr.target_url as string;
  if (qr.ab_test_url) {
    const w = typeof qr.ab_test_weight === "number" ? qr.ab_test_weight : 50;
    targetUrl = Math.random() * 100 < w ? qr.target_url : qr.ab_test_url;
  }

  // Conditional routing rules
  const ruled = applyRules(targetUrl, (qr.rules ?? null) as Rules | null, req, ua);
  const finalUrl = appendUtm(ruled, qr as Record<string, string | null>);

  // Tracking bridge (Pixel / GA4 / GTM)
  if ((qr.pixel_id && qr.pixel_enabled === true) || effGa4 || effGtm) {
    return new NextResponse(bridgePage({
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
