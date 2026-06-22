import * as htmlEntities from "html-entities";

// ─── HTML Sanitization ────────────────────────────────────────────────────────
/**
 * Safely escape HTML special characters to prevent XSS
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return htmlEntities.encode(input);
}

// Resimler sadece kendi Supabase Storage public bucket'ımızdan kabul edilir —
// arbitrary <img src> hem tracking pixel hem de (data:/javascript: gibi
// şemalarla) XSS vektörü olabilir. /api/v1/uploads rotasının döndürdüğü URL
// formatıyla eşleşir.
function trustedImagePrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/`;
}

/**
 * Sanitize HTML by allowing only safe tags and attributes
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  // <img> etiketlerini genel encode geçişinden önce ayıkla — src güvenilir
  // bucket'tan değilse görsel tamamen düşürülür, güvenilirse src/alt dışındaki
  // her şey (onerror, style, vs.) atılıp temiz bir etiketle değiştirilir.
  // Kontrol karakteri placeholder kullanılıyor ki mesaj metninde tesadüfen
  // aynı string geçerse çakışma olmasın.
  const images: string[] = [];
  const trustedPrefix = trustedImagePrefix();
  const working = input.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\bsrc\s*=\s*"([^"]*)"|\bsrc\s*=\s*'([^']*)'/i);
    const src = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? "") : "";
    if (!trustedPrefix || !src.startsWith(trustedPrefix)) return "";
    const altMatch = tag.match(/\balt\s*=\s*"([^"]*)"|\balt\s*=\s*'([^']*)'/i);
    const alt = altMatch ? (altMatch[1] ?? altMatch[2] ?? "") : "";
    const placeholder = `IMG${images.length}`;
    images.push(`<img src="${sanitizeAttribute(src)}" alt="${sanitizeAttribute(alt)}" style="max-width:100%;border-radius:8px;display:block;margin:8px 0;" />`);
    return placeholder;
  });

  // First, escape everything
  let safe = htmlEntities.encode(working);
  // Then, unescape allowed tags
  const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span', 'ul', 'ol', 'li'];
  allowedTags.forEach(tag => {
    const escapedTag = htmlEntities.encode(`<${tag}>`);
    const unescapedTag = `<${tag}>`;
    safe = safe.replace(new RegExp(escapedTag, 'g'), unescapedTag);
    const escapedCloseTag = htmlEntities.encode(`</${tag}>`);
    const unescapedCloseTag = `</${tag}>`;
    safe = safe.replace(new RegExp(escapedCloseTag, 'g'), unescapedCloseTag);
  });
  // contentEditable kelime arası boşluk için &nbsp; üretir — yukarıdaki encode
  // bunu &amp;nbsp; yapar, allowedTags listesindeki gibi geri açılması gerekir.
  safe = safe.replace(/&amp;nbsp;/g, '&nbsp;');

  images.forEach((img, i) => {
    safe = safe.replace(`IMG${i}`, img);
  });

  return safe;
}

/**
 * Escape for use in HTML attributes
 */
export function sanitizeAttribute(input: string | null | undefined): string {
  if (!input) return "";
  return escapeHtml(input)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Escape for use in JavaScript strings
 */
export function sanitizeJavaScript(input: string | null | undefined): string {
  if (!input) return "";
  return escapeHtml(input)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

/**
 * Safe JSON stringification for use in HTML
 */
export function sanitizeJson(obj: unknown): string {
  return sanitizeHtml(JSON.stringify(obj));
}

/**
 * Validate and sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return url;
  } catch {
    return "";
  }
}

/**
 * Bridge page safe HTML generation
 */
export function createSafeBridgePage(params: {
  title: string;
  redirectUrl: string;
  qrId: string;
  pixelId?: string | null;
  ga4Id?: string | null;
  gtmId?: string | null;
}): string {
  const { title, redirectUrl, qrId, pixelId, ga4Id, gtmId } = params;

  const safeTitle = sanitizeJavaScript(title);
  const safeRedirect = sanitizeAttribute(redirectUrl);
  const safeQrId = sanitizeJavaScript(qrId);
  const safePixelId = pixelId ? sanitizeJavaScript(pixelId) : "";
  const safeGa4Id = ga4Id ? sanitizeJavaScript(ga4Id) : "";
  const safeGtmId = gtmId ? sanitizeJavaScript(gtmId) : "";

  const hostname = (() => {
    try {
      const url = new URL(redirectUrl);
      return url.hostname;
    } catch {
      return "";
    }
  })();

  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle}</title>
${safeGtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${safeGtmId}');</script>` : ""}
${safeGa4Id ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${safeGa4Id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());
gtag('config','${safeGa4Id}',{send_page_view:true});gtag('event','qr_scan',{qr_id:'${safeQrId}',qr_title:'${safeTitle}'});</script>` : ""}
${safePixelId ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${safePixelId}');fbq('track','PageView');fbq('track','ViewContent',{content_ids:['${safeQrId}'],content_type:'product',content_name:'${safeTitle}'});</script>` : ""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:radial-gradient(ellipse at 40% 0%,#150d2e,#04040e 55%);color:#f1f5f9}.wrap{text-align:center;padding:2rem;max-width:360px;width:100%;animation:up .5s ease both}.icon{width:68px;height:68px;border-radius:18px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1.2rem;box-shadow:0 0 48px rgba(124,58,237,.45);animation:float 3s ease-in-out infinite}.ring{position:relative;width:52px;height:52px;margin:0 auto 1.25rem}.r1{width:52px;height:52px;border-radius:50%;border:2.5px solid transparent;border-top-color:#7c3aed;animation:spin .8s linear infinite}.r2{position:absolute;inset:8px;border-radius:50%;border:2px solid transparent;border-bottom-color:#4f46e5;animation:spin .55s linear infinite reverse}.bar{width:160px;height:2px;background:rgba(255,255,255,.07);border-radius:99px;margin:1.1rem auto 0;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,#7c3aed,#4f46e5);animation:prog 1.6s ease-out forwards}.host{margin-top:1.1rem;font-size:.65rem;color:#1e293b;font-family:monospace}h1{font-size:1.25rem;font-weight:700;background:linear-gradient(130deg,#a78bfa,#818cf8 60%,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.25rem}.sub{font-size:.72rem;color:#475569;letter-spacing:.06em;margin-bottom:2rem}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes prog{from{width:4%}to{width:100%}}@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}</style></head>
<body>${safeGtmId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${safeGtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : ""}<div class="wrap"><div class="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="3" height="3" rx=".6"/><rect x="18" y="14" width="3" height="3" rx=".6"/><rect x="14" y="18" width="3" height="3" rx=".6"/><rect x="18" y="18" width="3" height="3" rx=".6"/></svg></div>
<h1>QR Hub</h1><p class="sub">GÜVENLİ YÖNLENDİRME</p>
<div class="ring"><div class="r1"></div><div class="r2"></div></div>
<div class="bar"><div class="fill"></div></div><p class="host">${hostname}</p></div>
<script>setTimeout(()=>window.location.replace("${safeRedirect}"),1600);</script></body></html>`;
}
